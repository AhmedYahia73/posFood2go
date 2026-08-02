import { getCurrencySymbol } from '../utils/currency';
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
import { ArrowLeft, Clock, Package } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function PendingOrders() {
  const navigate = useNavigate();
  const { data: pendingOrders, loading, error, refetch } = useGet("cashier/get_pending_orders");
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [selectedOrderPrepareStatus, setSelectedOrderPrepareStatus] = useState("0"); // Fallback state
  const [orderDetailsEndpoint, setOrderDetailsEndpoint] = useState(null);
  const { t, i18n } = useTranslation();
  const locale = i18n.language || "en";

  const {
    data: orderDetailsData,
    loading: orderLoading,
    error: orderError
  } = useGet(orderDetailsEndpoint);

  useEffect(() => {
    if (error) {
      toast.error(`${t("Errorloadingpendingorders")}: ${error}`);
    }
  }, [error]);

  useEffect(() => {
    if (orderError) {
      toast.error(`${t("Errorloadingorderdetails")}: ${orderError}`);
      setSelectedOrderId(null);
      setOrderDetailsEndpoint(null);
    }
  }, [orderError]);



  useEffect(() => {
    if (orderDetailsData && orderDetailsData.id) {
      const orderRawData = orderDetailsData;
      console.log("🐛 PendingOrders API Data:", orderRawData);
      const mappedOrderDetails = [];

      // ✅ استخدام order_details (مش order) لأن فيه كل التفاصيل
      const itemsArray = orderRawData.order_details || [];

      itemsArray.forEach((item) => {
        // ✅ البيانات موجودة في item.product[0].product
        if (Array.isArray(item.product) && item.product.length > 0) {
          const prodWrapper = item.product[0];
          const productInfo = prodWrapper.product;
          const itemCount = Number(prodWrapper.count || 1);

          if (productInfo) {
            mappedOrderDetails.push({
              // ✅ نحتفظ بكل البيانات من الـ API
              ...productInfo,
              product_id: productInfo.id,
              id: productInfo.id,
              product_name: productInfo.name || "Unknown Product",
              name: productInfo.name,

              // ✅ الأسعار من الـ API
              price: parseFloat(productInfo.price_after_tax || productInfo.final_price || 0),
              originalPrice: parseFloat(productInfo.price || 0),
              final_price: parseFloat(productInfo.final_price || 0),
              price_after_discount: parseFloat(productInfo.price_after_discount || 0),
              price_after_tax: parseFloat(productInfo.price_after_tax || 0),

              // ✅ الخصم والضريبة من الـ API
              discount_val: parseFloat(productInfo.discount_val || 0),
              tax_only: parseFloat(productInfo.tax_only || 0),
              tax_val: parseFloat(productInfo.tax_val || 0),
              discount: productInfo.discount,
              tax: productInfo.tax,
              tax_obj: productInfo.tax_obj,

              // ✅ الكمية
              count: itemCount,
              quantity: itemCount,

              // ✅ الـ variations من item (مش من productInfo)
              variations: item.variations || [],
              selectedVariations: item.variations?.map(v => v.variation?.name || v.name) || [],
              
              // ✅ الـ addons والـ excludes من item
              addons: item.addons || [],
              selectedExtras: item.addons || [],
              excludes: item.excludes || [],
              selectedExcludes: item.excludes || [],
              extras: item.extras || [],

              // ✅ الصور والبيانات الأخرى
              image: productInfo.image_link,
              image_link: productInfo.image_link,
              description: productInfo.description,

              // ✅ باقي البيانات
              allExtras: productInfo.allExtras || [],
              weight_status: productInfo.weight_status || 0,
              product_code: productInfo.product_code,
              category_id: productInfo.category_id,
              sub_category_id: productInfo.sub_category_id,
              item_type: productInfo.item_type,
              stock_type: productInfo.stock_type,
              taxes: productInfo.taxes,

              // ✅ الملاحظات والـ temp_id
              notes: prodWrapper.notes || "",
              temp_id: `pending_${productInfo.id}_${Math.random().toString(36).substr(2, 5)}`,
            });
          }
        }
      });

      const finalOrderData = {
        orderId: orderRawData.id,
        orderDetails: mappedOrderDetails,
        totalAmount: parseFloat(orderRawData.amount || 0),
        orderNumber: orderRawData.order_number,
        notes: orderRawData.notes,
        // Use API value first, then fallback to list value, then default "0"
        prepare_order: orderRawData.prepare_order || orderRawData.order?.prepare_order || selectedOrderPrepareStatus || "0"
      };

      console.log("✅ PendingOrders: Mapped Order Data =", finalOrderData);
      console.log("✅ PendingOrders: orderDetails =", mappedOrderDetails);

      // ❌ نشيل localStorage تماماً - نعتمد على state بس
      // localStorage.setItem("cart", JSON.stringify(mappedOrderDetails));
      // localStorage.setItem("pending_order_info", JSON.stringify({...}));

      // ✅ التوجيه لشاشة الـ POS مع البيانات في state فقط
      navigate("/", {
        state: {
          activeTab: "takeaway",
          pendingOrder: finalOrderData,
          fromPendingOrders: true, // ✅ flag عشان نعرف إننا جايين من pending
        }
      });
    }
  }, [orderDetailsData, navigate]);


  const handleSelectOrder = (orderId, prepareStatus) => {
    if (orderLoading || selectedOrderId) return;

    console.log("Selecting order:", orderId, "Prepare Status:", prepareStatus);
    setSelectedOrderId(orderId);
    setSelectedOrderPrepareStatus(prepareStatus ? prepareStatus.toString() : "0");
    setOrderDetailsEndpoint(`cashier/get_order/${orderId}?locale=${locale}`);
  };

  const formatDate = (dateString) => {
    // إذا كانت القيمة فارغة أو غير موجودة
    if (!dateString) return "—";

    const date = new Date(dateString);

    // التحقق من صحة التاريخ (لأن try-catch لا تكتشف Invalid Date في JS)
    if (isNaN(date.getTime())) {
      // محاولة إرجاع نص التاريخ الأصلي بدلاً من Invalid Date
      return dateString;
    }

    // التنسيق بناءً على لغة النظام
    return date.toLocaleDateString(locale === "ar" ? "ar-EG" : "en-US", {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatOrderItems = (orderArray) => {
    if (!Array.isArray(orderArray)) return t("Noitems");

    const items = [];

    orderArray.forEach(orderDetail => {
      // في الـ API الكبير، البيانات موجودة داخل order_details -> product (وهي مصفوفة)
      if (Array.isArray(orderDetail.product) && orderDetail.product.length > 0) {

        orderDetail.product.forEach(p => {
          // سحب الـ count وتحويله لرقم من داخل المصفوفة الداخلية
          const itemCount = Number(p.count) || 1;
          const productName = p.product?.name || t("UnknownProduct");

          items.push(`${productName} x${itemCount}`);
        });

      } else if (orderDetail.product && orderDetail.product.name) {
        // هذا الجزء احتياطي في حال كان الهيكل بسيطاً (كائن وليس مصفوفة)
        const itemCount = Number(orderDetail.count) || 1;
        items.push(`${orderDetail.product.name} x${itemCount}`);
      }
    });

    return items.length > 0 ? items.join(", ") : t("Noitemsavailable");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex m-auto items-center gap-4">

            <h1 className="text-3xl font-bold text-gray-800 flex  items-center gap-2">
              <Clock className="text-orange-600" size={32} />
              {t("PendingOrders")}
            </h1>
          </div>

        </div>

        {loading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-600">{t("Errorloadingpendingorders")}: {error}</p>
            <Button
              onClick={refetch}
              variant="outline"
              className="mt-2"
              disabled={loading}
            >
              {t("Retry")}
            </Button>
          </div>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {!pendingOrders || !Array.isArray(pendingOrders.all_orders) || pendingOrders.all_orders.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Package className="mx-auto mb-4 text-gray-400" size={64} />
                <p className="text-gray-500 text-lg">{t("Nopendingordersfound")}</p>

              </div>
            ) : (
              pendingOrders.all_orders.map((order) => (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md border hover:shadow-lg transition-all duration-200 cursor-pointer transform hover:scale-[1.02] ${selectedOrderId === order.id
                    ? 'ring-2 ring-orange-500 bg-orange-50 shadow-xl'
                    : 'hover:border-orange-200'
                    } ${orderLoading && selectedOrderId === order.id ? 'pointer-events-none opacity-75' : ''}`}
                  onClick={() => handleSelectOrder(order.id, order.prepare_order)}
                >
                  <div className="p-6 relative">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-800">
                          {t("Order")} #{order.order_number || order.id}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at || order.date || order.order_details?.[0]?.product?.[0]?.product?.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                          {order.status || "Pending"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Customer")}:</span>
                        <span className="font-medium">{order.customer_name || order.name || "N/A"}</span>
                      </div>
                      {order.phone && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">{t("Phone")}:</span>
                          <span className="font-medium">{order.phone}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">{t("Total")}:</span>
                        <span className="font-bold text-green-600">
                          {parseFloat(order.amount || 0).toFixed(2)} {getCurrencySymbol()}
                        </span>
                      </div>
                      {order.notes && (
                        <div className="text-xs text-gray-500">
                          <span className="font-medium">{t("Notes")}:</span> {order.notes}
                        </div>
                      )}
                    </div>
                    {/* داخل الـ map الخاص بـ pendingOrders.all_orders */}
                    {order.order_details && (
                      <div className="border-t pt-3">
                        <p className="text-xs text-gray-600 mb-1">{t("Items")}:</p>
                        <p className="text-sm text-gray-800 line-clamp-2">
                          {/* تمرير order_details بدلاً من order */}
                          {formatOrderItems(order.order_details)}
                        </p>
                      </div>
                    )}

                    {selectedOrderId === order.id && orderLoading && (
                      <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center rounded-lg">
                        <div className="flex flex-col items-center gap-3">
                          <Loading />
                          <span className="text-sm text-gray-600 font-medium">{t("Loadingorderdetails")}</span>
                        </div>
                      </div>
                    )}

                    {!orderLoading && (
                      <div className="absolute bottom-4 right-4 opacity-60 group-hover:opacity-100 transition-opacity">
                        <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}