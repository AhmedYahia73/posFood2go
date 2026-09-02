import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { Circle, Hourglass, CheckCircle, ChefHat, Truck, Package } from "lucide-react";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { getCurrencySymbol } from "../utils/currency";

// حالات التحضير لكل نوع طلب
const TAKE_AWAY_STATUSES = {
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
  },
  pick_up: {
    label: "Pick Up",
    icon: ChefHat,
    color: "text-blue-500",
  },
};

const DELIVERY_STATUSES = {
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
  },
  ready_for_delivery: {
    label: "Ready for Delivery",
    icon: Package,
    color: "text-blue-500",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: Truck,
    color: "text-purple-500",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-green-600",
  },
  returned: {
    label: "Returned",
    icon: Circle,
    color: "text-red-500",
  },
};

// حالات الـ Dine In
const DINE_IN_STATUSES = {
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-500",
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    color: "text-blue-600",
  },
};

// Helper to get safe order number
const getOrderNumber = (order) => {
  if (!order) return "";
  const num = order.order_number;
  if (num && num !== "null" && num !== "undefined" && String(num).trim() !== "") {
    return num;
  }
  const modNum = order.module_order_number;
  if (modNum && modNum !== "null" && modNum !== "undefined" && String(modNum).trim() !== "") {
    return modNum;
  }
  return order.id || order._id || "";
};

// Helper to get safe order date
const getOrderDate = (order) => {
  if (!order) return "";
  const d =
    order.createdAt ||
    order.created_at ||
    (order.date && order.date !== "null" ? order.date : "") ||
    (order.order_date && order.order_date !== "null" ? order.order_date : "");
  if (!d || d === "null" || d === "undefined") return "";
  return d;
};

// Helper to extract items safely from order
const getOrderItems = (order) => {
  if (!order) return [];
  let details = order.order_details || order.products || order.items || [];
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch (e) {
      details = [];
    }
  }
  if (!Array.isArray(details)) return [];

  const items = [];
  details.forEach((detail) => {
    // 1. If detail.product is an Array
    if (Array.isArray(detail.product)) {
      detail.product.forEach((p) => {
        const prodObj = p.product || p;
        const name = prodObj.name || prodObj.product_name || p.name || p.product_name || "Unknown Product";
        const count = parseFloat(p.count || p.quantity || detail.count || 1);
        const variations = (detail.variations || [])
          .flatMap((v) => (v.options || []).map((o) => o.name))
          .filter(Boolean);
        items.push({
          name,
          count,
          notes: p.notes || detail.notes,
          variations,
        });
      });
    }
    // 2. If detail.product is an Object
    else if (detail.product && typeof detail.product === "object") {
      const prodObj = detail.product.product || detail.product;
      const name = prodObj.name || prodObj.product_name || detail.name || detail.product_name || "Unknown Product";
      const count = parseFloat(detail.product.count || detail.count || detail.quantity || 1);
      const variations = (detail.variations || [])
        .flatMap((v) => (v.options || []).map((o) => o.name))
        .filter(Boolean);
      items.push({
        name,
        count,
        notes: detail.product.notes || detail.notes,
        variations,
      });
    }
    // 3. Fallback: detail itself has name
    else {
      const name = detail.name || detail.product_name || detail.title || "Unknown Product";
      const count = parseFloat(detail.count || detail.quantity || 1);
      items.push({
        name,
        count,
        notes: detail.notes,
        variations: [],
      });
    }
  });

  return items;
};

export default function OrdersView() {
  const location = useLocation();
  const { data, error, isLoading: isInitialLoading } = useGet("cashier/home/cashier_data");
  const { putData } = usePut();
  const [search, setSearch] = useState("");

  // جلب نوع الطلب من الـ state أو من localStorage
  const passedOrderType = location.state?.orderType;
  const savedOrderType = localStorage.getItem("order_type") || "take_away";
  const orderType = passedOrderType ?? savedOrderType;

  // حفظ النوع في localStorage عشان يفضل بعد الـ refresh
  useEffect(() => {
    localStorage.setItem("order_type", orderType);
  }, [orderType]);

  // تحديد الأوردرات حسب النوع
  let orders = [];
  if (orderType === "take_away" && Array.isArray(data?.take_away)) {
    orders = data.take_away;
  } else if (orderType === "dine_in" && Array.isArray(data?.dine_in)) {
    orders = data.dine_in;
  } else if (orderType === "delivery" && Array.isArray(data?.delivery)) {
    orders = data.delivery;
  }

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // حالات الأوردرات (للأزرار)
  const [statuses, setStatuses] = useState({});
  useEffect(() => {
    if (data && orders.length > 0) {
      const initialStatuses = orders.reduce((acc, order) => {
        const orderId = order.id || order._id;
        acc[orderId] =
          orderType === "take_away"
            ? (order.take_away_status || order.order_status || "watting")
            : orderType === "delivery"
            ? (order.delivery_status || order.order_status || "watting")
            : (order.order_status || "preparing");
        return acc;
      }, {});
      setStatuses(initialStatuses);
    }
  }, [data, orders, orderType]);

  const [updatingStatus, setUpdatingStatus] = useState({});

  if (isInitialLoading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">Error loading data.</div>;

  // فلترة الأوردرات حسب البحث وحسب الحالة (مخفية للحالات المنتهية)
  const filteredOrders = orders.filter((order) => {
    const orderId = order.id || order._id;
    const status = statuses[orderId] || (orderType === "take_away" ? order.take_away_status : orderType === "delivery" ? order.delivery_status : order.order_status);
    const isVisible =
      orderType === "take_away"
        ? status !== "pick_up"
        : orderType === "delivery"
        ? status !== "delivered"
        : true; // للـ dine_in نعرض الكل عادي

    if (!isVisible) return false;

    if (!search || search.trim() === "") return true;

    const query = search.trim().toLowerCase();
    const orderNum = String(getOrderNumber(order)).toLowerCase();
    const id = String(order.id || order._id || "").toLowerCase();
    const modNum = String(order.module_order_number || "").toLowerCase();
    const customerName = String(order.customer_name || order.user?.name || "").toLowerCase();

    return orderNum.includes(query) || id.includes(query) || modNum.includes(query) || customerName.includes(query);
  });

  // تغيير حالة الطلب
  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));

    let url = "";
    let payload = {};

    if (orderType === "take_away") {
      url = `cashier/take_away_status/${orderId}`;
      payload = { take_away_status: newStatus };
    } else if (orderType === "delivery") {
      url = `cashier/order_status/${orderId}`;
      payload = { delivery_status: newStatus };
    }

    if (url) {
      try {
        const response = await putData(url, payload);
        if (response && (response.success || response.status === 200 || response.data)) {
          setStatuses((prev) => ({
            ...prev,
            [orderId]: newStatus,
          }));
          toast.success(t("Statusupdatedsuccessfully") || "Status updated successfully");
        } else {
          toast.error(t("Failedtoupdatestatus") || "Failed to update status");
        }
      } catch (err) {
        toast.error(t("Errorupdatingstatus", err) || "Error updating status");
      } finally {
        setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

  // جلب حالات الأزرار المتاحة حسب نوع الطلب
  const getAvailableStatuses = () => {
    if (orderType === "take_away") return TAKE_AWAY_STATUSES;
    if (orderType === "delivery") return DELIVERY_STATUSES;
    if (orderType === "dine_in") return DINE_IN_STATUSES;
    return {};
  };

  return (
    <div className="p-6 space-y-6" dir={isArabic ? "rtl" : "ltr"}>
      <Input
        type="text"
        placeholder={t("SearchOrderNumber")}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md mx-auto"
      />

      <h2 className="text-xl font-semibold mt-6 text-center">
        {t("Orders")}{" "}
        <span className="capitalize">
          {orderType === "take_away"
            ? t("take_away")
            : orderType === "delivery"
            ? t("delivery")
            : orderType === "dine_in"
            ? t("dine_in")
            : t("orders")}
        </span>
      </h2>

      {filteredOrders.length === 0 ? (
        <p className="text-gray-500 text-center">{t("Noordersfound")}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const orderId = order.id || order._id;
            const items = getOrderItems(order);
            const orderNum = getOrderNumber(order);
            const orderDate = getOrderDate(order);

            return (
              <Card key={orderId} className="border shadow-sm bg-white flex flex-col h-full hover:shadow-md transition-shadow">
                <CardContent className="p-4 space-y-3 flex-grow">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">#{orderNum}</h3>

                    {/* أزرار تغيير الحالة */}
                    {orderType !== "dine_in" && (
                      <div className="flex gap-2 flex-wrap">
                        {Object.entries(getAvailableStatuses()).map(([key, value]) => {
                          const isActive = statuses[orderId] === key;
                          return (
                            <Button
                              key={key}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className={`${value.color}`}
                              disabled={updatingStatus[orderId]}
                              onClick={() => handleStatusChange(orderId, key)}
                            >
                              <value.icon size={16} className="mr-1" />
                              {t(value.label)}
                            </Button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-500 border-b pb-2">
                    <span>{orderDate}</span>
                    {order.amount !== undefined && order.amount !== null && order.amount !== "null" && (
                      <span className="font-semibold text-gray-800">
                        {parseFloat(order.amount).toFixed(2)} {getCurrencySymbol()}
                      </span>
                    )}
                  </div>

                  {order.notes && order.notes !== "null" && order.notes !== "note" && (
                    <p className="text-xs text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                      <span className="font-semibold">{t("Notes") || "Notes"}: </span>
                      {order.notes}
                    </p>
                  )}

                  <div className="space-y-1">
                    <p className="text-sm font-medium">{t("Items")}:</p>
                    <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                      {items.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-medium">{item.name}</span>
                          {item.variations?.length > 0 && (
                            <span className="text-xs text-gray-500"> ({item.variations.join(", ")})</span>
                          )}
                          {" "}× {item.count}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}