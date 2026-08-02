import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { toast, ToastContainer } from "react-toastify";
import { X, Trash2, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import VoidOrderModal from "./VoidOrderModal";
import axiosInstance from "@/Pages/utils/axiosInstance";
import { useNavigate } from "react-router-dom";
export default function AllOrders() {
  const [showModal, setShowModal] = useState(true);
  const [password, setPassword] = useState("");
  const [orders, setOrders] = useState([]); // الطلبات العادية
  const [fakeOrders, setFakeOrders] = useState([]); // الطلبات الوهمية
  const [isFakeMode, setIsFakeMode] = useState(false);
  const [displayedOrders, setDisplayedOrders] = useState([]);
  const navigate = useNavigate();
  // فلاتر الإدخال (قبل الضغط على البحث)
  const [searchInput, setSearchInput] = useState("");
  const [dateFromInput, setDateFromInput] = useState("");
  const [dateToInput, setDateToInput] = useState("");

  // الفلاتر المطبقة فعلياً بعد الضغط على زر البحث
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedDateFrom, setAppliedDateFrom] = useState("");
  const [appliedDateTo, setAppliedDateTo] = useState("");

  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Print States
  const [isPrinting, setIsPrinting] = useState(false);

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const locale = isArabic ? "ar" : "en";
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const { postData, loading } = usePost();
  const { refetch, loading: getLoading } = useGet();

  useEffect(() => {
    if (isFakeMode || orders.length === 0) return;

    let filtered = orders.filter((order) => {
      const orderDateStr = order.created_at || order.date || "";
      const orderDate = orderDateStr.split("T")[0];

      const dateMatch =
        (!dateFromInput || orderDate >= dateFromInput) &&
        (!dateToInput || orderDate <= dateToInput);

      return dateMatch;
    });

    // تطبيق الفلترة النصية
    filtered = applyTextFilter(filtered);

    setDisplayedOrders(filtered);
  }, [searchInput, dateFromInput, dateToInput, orders, isFakeMode]);

  const fetchNormalOrders = async () => {
    try {
      const res = await postData("cashier/orders/point_of_sale", { password });
      console.log(res?.orders);

      if (res?.orders) {
        if (res.state === 3) {
          setIsFakeMode(true);
          // ⭐ التعديل الجديد: نعرض الطلبات الوهمية مباشرة
          const fakeData = res.orders || [];
          setFakeOrders(fakeData);
          setDisplayedOrders(fakeData);  // هنا هتعرض في الجدول فورًا
          toast.info(t("OrdersModeActivated"));
        } else {
          setIsFakeMode(false);
          setOrders(res.orders);
          setDisplayedOrders(res.orders);  // زي ما هو
        }

        setShowModal(false);
        toast.success(t("Accessgrantedsuccessfully"));
      } else {
        toast.error(t("Incorrectpassword"));
      }
    } catch (err) {
      let error = err.response?.data?.errors;
      toast.error(error);
      console.error("Error fetching normal orders:", err.response?.data?.errors);
    }
  };

  const fetchFakeOrders = async (fromDate, toDate) => {
    try {
      const response = await refetch(
        `cashier/reports/filter_fake_order?date=${fromDate}&date_to=${toDate}`
      );

      let fakeData = response?.orders || response?.data || response || [];

      // تطبيق الفلترة النصية بعد الجلب
      fakeData = applyTextFilter(fakeData);

      setFakeOrders(fakeData);
      setDisplayedOrders(fakeData);
    } catch (err) {
      console.error("Error fetching orders:", err);
      const errorMsg =
        err.response?.data?.message || t("FailedToLoadOrders");
      toast.error(errorMsg);
      setFakeOrders([]);
      setDisplayedOrders([]);
    }
  };
  const handlePasswordSubmit = () => {
    if (!password.trim()) return toast.error(t("Pleaseenteryourpassword"));
    fetchNormalOrders();
  };

  // عند الضغط على زر البحث
  const handleSearch = () => {
    // حفظ القيم المطبقة
    setAppliedSearch(searchInput);
    setAppliedDateFrom(dateFromInput);
    setAppliedDateTo(dateToInput);

    if (isFakeMode) {
      if (!dateFromInput || !dateToInput) {
        toast.warning(t("PleaseSelectDateRange"));
        return;
      }
      fetchFakeOrders(dateFromInput, dateToInput);
    } else {
      // الوضع العادي: فلترة محلية
      let filtered = orders.filter((order) => {
        const orderDate = (order.created_at || "").split("T")[0];

        const dateMatch =
          (!dateFromInput || orderDate >= dateFromInput) &&
          (!dateToInput || orderDate <= dateToInput);

        return dateMatch;
      });

      // تطبيق الفلترة النصية
      filtered = applyTextFilter(filtered);

      setDisplayedOrders(filtered);
    }
  };
  // Handle Void Click
  const handleVoidClick = (order) => {
    setSelectedOrder(order);
    setShowVoidModal(true);
  };

  // Handle Void Success - Refresh Orders
  const handleVoidSuccess = async () => {
    try {
      if (isFakeMode) {
        // في وضع الطلبات الوهمية: نعيد الجلب بنفس الفلاتر المطبقة
        if (appliedDateFrom && appliedDateTo) {
          await fetchFakeOrders(appliedDateFrom, appliedDateTo);
        }
      } else {
        await fetchNormalOrders();
      }
      toast.success(t("Ordersrefreshedsuccessfully"));
    } catch (err) {
      console.error("Refresh Error:", err);
      toast.error(t("Failedtorefreshorders") || t("FailedToRefreshOrders"));
    }
  };

  // =========================================================
  // دالة توليد تصميم الفاتورة
  // =========================================================
  const generateReceiptHTML = (data) => {
    const orderType = data.order_type || "";
    let orderTypeLabel = t("take_away");
    let tableLabel = "";

    if (orderType === "dine_in") {
      orderTypeLabel = t("Dinein");
      if (data.table) {
        tableLabel = t("Table") + ": " + data.table;
      }
    } else if (orderType === "delivery") {
      orderTypeLabel = t("Delivery");
    } else if (orderType === "pickup") {
      orderTypeLabel = t("PickUp");
    }

    const showCustomerInfo = orderType === "delivery" && data.user;
    const restaurantName =
      localStorage.getItem("resturant_name") || t("title");

    const subtotal = (data.amount - (data.total_tax || 0) - (data.delivery_fees || 0)).toFixed(2);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Print Order ${data.order_number}</title>
          <style>
            @page { margin: 0; size: auto; }
            body {
              margin: 0 !important;
              padding: 0 !important;
              width: 100% !important;
              background-color: #fff;
              font-family: 'Tahoma', 'Arial', sans-serif;
              color: #000;
              direction: ${isArabic ? "rtl" : "ltr"};
              font-size: 12px;
            }
            .container {
              width: 100% !important;
              padding: 5px 2px;
              margin: 0;
              box-sizing: border-box;
            }
            .header { text-align: center; margin-bottom: 10px; }
            .header h1 { 
              font-size: 24px; font-weight: 900; margin: 0; 
              text-transform: uppercase; letter-spacing: 1px;
            }
            .header p { margin: 2px 0; font-size: 12px; color: #333; }
            .header .phone { font-weight: bold; font-size: 13px; margin-top: 2px;}

            .order-badge {
              border: 2px solid #000; background-color: #000; color: white;
              text-align: center; font-size: 18px; font-weight: 900;
              padding: 5px; margin: 5px 0; border-radius: 4px;
            }
            .table-info { text-align: center; font-weight: bold; font-size: 14px; margin-bottom: 5px; }

            .meta-grid { 
              width: 100%; border-top: 1px dashed #000; border-bottom: 1px dashed #000; 
              margin-bottom: 8px; padding: 5px 0;
            }
            .meta-label { font-size: 10px; color: black; }
            .meta-value { font-size: 14px; font-weight: 900; }

            .section-header {
              background-color: #eee; border-top: 1px solid #000; border-bottom: 1px solid #000;
              color: #000; text-align: center; font-weight: bold; font-size: 12px;
              padding: 3px 0; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase;
            }

            .items-table { width: 100%; border-collapse: collapse; }
            .items-table th { 
              text-align: center; font-size: 11px; border-bottom: 2px solid #000; padding-bottom: 4px;
            }
            .items-table td { 
              padding: 6px 0; border-bottom: 1px dashed #ccc; vertical-align: top;
            }
            .item-qty { font-size: 13px; font-weight: bold; text-align: center; }
            .item-name { font-size: 13px; font-weight: bold; padding: 0 5px; }
            .item-total { font-size: 13px; font-weight: bold; text-align: center; }
            .addon-row { font-size: 11px; color: #444; margin-top: 2px; font-weight: normal; }
            .notes-row { font-size: 11px; font-style: italic; color: #555; }

            .totals-row { display: flex; justify-content: space-between; margin-bottom: 3px; font-size: 12px; font-weight: bold;}
            .grand-total {
              border: 2px solid #000; padding: 8px; margin-top: 8px;
              text-align: center; font-size: 22px; font-weight: 900;
              display: flex; justify-content: space-between; align-items: center;
            }
            .cust-info { font-size: 12px; font-weight: bold; line-height: 1.4; padding: 5px; border: 1px dotted #000; margin-bottom: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            
            <div class="header">
              <h1>${restaurantName}</h1>
              <p>${data.branch?.address || ""}</p>
              <div class="phone">${data.branch?.phone || ""}</div>
            </div>

            <div class="order-badge">${orderTypeLabel}</div>
            ${tableLabel ? `<div class="table-info">${tableLabel}</div>` : ""}

            <table class="meta-grid">
              <tr>
                <td width="50%" style="border-${isArabic ? "left" : "right"}: 1px dotted #000; padding: 0 5px;">
                  <div class="meta-label">${t("OrderNumber")}</div>
                  <div class="meta-value" style="font-size: 18px;">#${data.order_number}</div>
                </td>
                <td width="50%" style="padding: 0 5px; text-align: ${isArabic ? "left" : "right"};">
                  <div class="meta-label">${t("DateTime")}</div>
                  <div style="font-weight: bold; font-size: 11px;">${data.order_date || "—"}</div>
                  <div style="font-weight: bold; font-size: 11px;">${data.order_time || "—"}</div>
                </td>
              </tr>
            </table>

            ${showCustomerInfo ? `
              <div class="section-header">${isArabic ? "بيانات العميل" : "CUSTOMER INFO"}</div>
              <div class="cust-info">
                <div>${data.user?.name || "—"}</div>
                <div style="direction: ltr; text-align: ${isArabic ? "right" : "left"};">${data.user?.phone || "—"}</div>
                ${data.address ? `
                  <div style="font-weight: normal; margin-top: 3px; border-top: 1px dotted #ccc; padding-top:2px;">
                    ${data.address.address || ""}
                    ${data.address.building_num ? `, B:${data.address.building_num}` : ""}
                    ${data.address.floor_num ? `, F:${data.address.floor_num}` : ""}
                    ${data.address.apartment ? `, Apt:${data.address.apartment}` : ""}
                  </div>
                ` : ""}
              </div>
            ` : ""}

            <div class="section-header">${isArabic ? "الطلبات" : "ITEMS"}</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th width="25%">${isArabic ? "كمية" : "Qt"}</th>
                  <th width="50%" style="text-align: ${isArabic ? "right" : "left"};">${isArabic ? "الصنف" : "Item"}</th>
                  <th width="25%">${isArabic ? "إجمالي" : "Total"}</th>
                </tr>
              </thead>
              <tbody>
                ${data.order_details?.map(item => {
      const productObj = item.product || {};
      const price = Number(item.price || item.final_price || productObj.price || productObj.final_price || productObj.total_price || 0);
      const qty = Number(item.count || item.qty || productObj.count || 1);
      const addonsTotal = item.addons?.reduce((sum, addon) => sum + (Number(addon.total || addon.price || 0) * qty), 0) || 0;
      const rowTotal = Number(item.total || productObj.total || productObj.total_price || (price * qty)) + addonsTotal;

      let addonsHTML = "";
      if (item.addons && item.addons.length > 0) {
        addonsHTML = item.addons.map(add =>
          `<div class="addon-row">+ ${add.name} (${Number(add.price || add.total || 0).toFixed(2)})</div>`
        ).join("");
      }

      return `
                    <tr>
                      <td class="item-qty">${qty}</td>
                      <td class="item-name" style="text-align: ${isArabic ? "right" : "left"};">
                        ${item.name || productObj.name || "—"}
                        ${addonsHTML}
                        ${item.notes || productObj.notes ? `<div class="notes-row">(${item.notes || productObj.notes})</div>` : ""}
                      </td>
                      <td class="item-total">${rowTotal.toFixed(2)}</td>
                    </tr>
                  `;
    }).join("") || `<tr><td colspan="3" class="text-center py-4">${t("NoItemsFound")}</td></tr>`}
              </tbody>
            </table>

            <div style="border-top: 2px solid #000; margin-top: 5px; padding-top: 5px;">
              <div class="totals-row">
                <span>${isArabic ? "المجموع" : "Subtotal"}</span>
                <span>${subtotal}</span>
              </div>
              
              ${data.delivery_fees > 0 ? `
                <div class="totals-row">
                  <span>${isArabic ? "التوصيل" : "Delivery"}</span>
                  <span>${data.delivery_fees.toFixed(2)}</span>
                </div>
              ` : ""}
              
              ${data.total_discount > 0 ? `
                <div class="totals-row">
                  <span>${isArabic ? "الخصم" : "Discount"}</span>
                  <span>-${data.total_discount.toFixed(2)}</span>
                </div>
              ` : ""}
                            ${data.total_tax > 0 ? `
                <div class="totals-row">
                  <span>${isArabic ? "الضريبة" : "Tax"}</span>
                  <span>+${data.total_tax.toFixed(2)}</span>
                </div>
              ` : ""}

              <div class="grand-total">
                <span style="font-size: 16px;">${isArabic ? "الإجمالي" : "TOTAL"}</span>
                <span>${Number(data.amount).toFixed(2)}</span> 
              </div>
            </div>

            <div style="text-align: center; margin-top: 15px; font-size: 11px;">
              <p style="margin: 0; font-weight: bold;">
                ${t("ThankYouForVisit")}
              </p>
              <p style="margin: 5px 0 0 0;">***</p>
            </div>

          </div>
          <script>
            window.onload = function() {
              window.focus();
              window.print();
            }
          </script>
        </body>
      </html>
    `;
  };

  const handlePrintClick = async (order) => {
    if (isPrinting) return;
    setIsPrinting(true);

    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axiosInstance.get(
        `${baseUrl}cashier/orders/order_checkout/${order.id}?locale=${locale}`,
        { headers }
      );

      if (response?.data?.order_checkout) {
        const orderData = response.data.order_checkout;
        const receiptHTML = generateReceiptHTML(orderData);

        const iframe = document.createElement("iframe");
        iframe.style.position = "absolute";
        iframe.style.width = "0px";
        iframe.style.height = "0px";
        iframe.style.border = "none";
        document.body.appendChild(iframe);

        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(receiptHTML);
        doc.close();

        setTimeout(() => {
          document.body.removeChild(iframe);
          setIsPrinting(false);
        }, 2000);

        toast.success(t("Preparingprint") || "جاري الطباعة...");
      } else {
        throw new Error("No order checkout data received");
      }
    } catch (err) {
      toast.error(
        isArabic ? "فشل تحميل تفاصيل الطلب للطباعة" : "Failed to load order details for printing"
      );
      console.error("Print Error:", err);
      setIsPrinting(false);
    }
  };
  const handleClose = () => {
    // إخفاء المودال برمجياً
    if (setShowModal) setShowModal(false);

    // العودة للمسار الرئيسي (صفحة الكاشير)
    // بما أن الـ Navbar يعتمد على localStorage.getItem("tab")
    // فإنه سيفتح تلقائياً التبويب الذي كان المستخدم واقفاً عليه
    navigate("/", { replace: true });
  };
  const applyTextFilter = (ordersList) => {
    if (!searchInput.trim()) return ordersList;

    const searchLower = searchInput.toLowerCase();

    return ordersList.filter((order) => {
      const numberMatch = String(order.order_number || "").includes(searchInput);

      // التعديل الرئيسي: البحث في f_name و l_name بدلاً من name
      const nameMatch =
        (order.user?.f_name || "").toLowerCase().includes(searchLower) ||
        (order.user?.l_name || "").toLowerCase().includes(searchLower);

      const phoneMatch = (order.user?.phone || "").includes(searchInput);

      return numberMatch || nameMatch || phoneMatch;
    });
  };
  return (
    <div className="p-4" dir={isArabic ? "rtl" : "ltr"}>
      <ToastContainer />
      {/* Password Modal */}
      <Dialog open={showModal} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <DialogClose
            asChild
            onClick={() => setShowModal(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogClose>

          <DialogHeader>
            <DialogTitle>{t("EnterPassword")}</DialogTitle>
          </DialogHeader>

          <Input
            type="password"
            placeholder={t("Password")}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
          />

          <Button
            onClick={handlePasswordSubmit}
            disabled={loading}
            className="mt-3 w-full"
          >
            {loading ? t("Loading") : t("Login")}
          </Button>
        </DialogContent>
      </Dialog>

      {!showModal && (
        <>
          {/* Filters + Search Button */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6 flex-wrap items-end">
            <div className="flex-1 min-w-[240px]">
              <Input
                placeholder={
                  isArabic
                    ? "ابحث برقم الطلب، الاسم، أو رقم الجوال..."
                    : "Search by order number, name, or phone..."
                }
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {isArabic ? "من" : "From"}
              </span>
              <Input
                type="date"
                value={dateFromInput}
                onChange={(e) => setDateFromInput(e.target.value)}
                className="w-40"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 whitespace-nowrap">
                {isArabic ? "إلى" : "To"}
              </span>
              <Input
                type="date"
                value={dateToInput}
                onChange={(e) => setDateToInput(e.target.value)}
                className="w-40"
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={getLoading || loading}
              className="px-6"
            >
              {getLoading || loading
                ? t("Searching")
                : t("Search")}
            </Button>
          </div>


          {/* Orders Table */}
          <div className="overflow-x-auto rounded-lg shadow-md border" dir={isArabic ? "rtl" : "ltr"}>
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("OrderNumber")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Type")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("DeliveryFees") || "Delivery Fees"}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Amount")}
                  </th>
                  {/* العمود الجديد */}
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("CustomerInfo") || "Customer Info"}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Status")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Branch")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("DateTime")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Print")}
                  </th>
                  <th className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                    {t("Void")}
                  </th>
                </tr>
              </thead>
              <tbody className={getLoading ? "opacity-50 pointer-events-none" : ""}>
                {displayedOrders.map((order) => (
                  <tr key={order.id || order.order_number} className="hover:bg-gray-50 transition-colors">
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.order_number}
                    </td>
                    <td className={`border p-3 capitalize ${isArabic ? "text-right" : "text-left"}`}>
                      {order.order_type || "—"}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.delivery_fees > 0 ? (
                        <span className="font-semibold text-blue-600">
                          {order.delivery_fees}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.amount || "—"}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"} text-sm leading-relaxed`}>
                      {order.order_type === "delivery" && order.user ? (
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">
                            {order.user.f_name} {order.user.l_name || ""}
                          </span>
                          <span dir="ltr" className="text-gray-700">
                            {order.user.phone || "—"}
                          </span>
                          {order.address?.zone?.zone && (
                            <span className="text-gray-600 text-xs mt-1">
                              {isArabic ? "المنطقة: " : "Zone: "}
                              {order.address.zone.zone}
                            </span>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      <span
                        className={`px-3 py-1 text-xs rounded-full ${order.order_status === "completed"
                          ? "bg-green-100 text-green-700"
                          : order.order_status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-gray-700"
                          }`}
                      >
                        {order.order_status || "unknown"}
                      </span>
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {order.branch?.name || "—"}
                    </td>
                    <td className={`border p-3 ${isArabic ? "text-right" : "text-left"}`}>
                      {new Date(order.created_at || order.date || "").toLocaleString(
                        isArabic ? "ar-EG" : "en-US"
                      )}
                    </td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handlePrintClick(order)}
                        disabled={isPrinting || getLoading}
                        className={`text-blue-600 hover:text-blue-800 transition-colors p-2 rounded-lg hover:bg-blue-50 ${isPrinting ? "opacity-50 cursor-not-allowed" : ""
                          }`}
                        title={t("PrintOrder")}
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </td>
                    <td className="border p-3 text-center">
                      <button
                        onClick={() => handleVoidClick(order)}
                        className="text-red-600 hover:text-red-800 transition-colors p-2 rounded-lg hover:bg-red-50"
                        title={t("VoidOrder")}
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {displayedOrders.length === 0 && !getLoading && (
            <p className="text-center text-gray-500 mt-8">
              {isFakeMode
                ? t("NoOrdersFoundClickSearch")
                : t("NoOrdersMatchFilters")}
            </p>
          )}

        </>
      )}

      <VoidOrderModal
        isOpen={showVoidModal}
        onClose={() => {
          setShowVoidModal(false);
          setSelectedOrder(null);
        }}
        orderId={selectedOrder?.id}
        orderNumber={selectedOrder?.order_number}
        onSuccess={handleVoidSuccess}
      />
    </div>
  );
}