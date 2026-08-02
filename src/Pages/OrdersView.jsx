import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import { ChevronDownIcon } from "lucide-react";
import { Circle, Hourglass, CheckCircle, ChefHat, Truck, Package } from "lucide-react";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

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

// حالات الـ Dine In (عدّليها حسب اللي عندك في الـ backend)
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
  // لو عندك حالات تانية زي "served" أو "cancelled" أضيفيها هنا
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
        acc[order.id] = order.order_status || "preparing";
        return acc;
      }, {});
      setStatuses(initialStatuses);
    }
  }, [data, orders]);

  const [updatingStatus, setUpdatingStatus] = useState({});

  if (isInitialLoading) return <Loading />;
  if (error) return <div className="text-red-500 text-center">Error loading data.</div>;

  // فلترة الأوردرات حسب البحث وحسب الحالة (مخفية للحالات المنتهية)
  const filteredOrders = orders.filter((order) => {
    const status = statuses[order.id];
    const isVisible =
      orderType === "take_away"
        ? status !== "pick_up"
        : orderType === "delivery"
        ? status !== "delivered"
        : true; // للـ dine_in نعرض الكل عادي

    return order.order_number?.toString().includes(search) && isVisible;
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
    // لو عايزة تغيير حالة للـ dine_in أضيفي endpoint هنا

    if (url) {
      try {
        const response = await putData(url, payload);
        if (response && response.success) {
          setStatuses((prev) => ({
            ...prev,
            [orderId]: newStatus,
          }));
          toast.success(t("Statusupdatedsuccessfully"));
        } else {
          toast.error("Failedtoupdatestatus");
        }
      } catch (err) {
        toast.error(t("Errorupdatingstatus",err));
      } finally {
        setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
      }
    }
  };

  // جلب حالات الأزرار المتاحة حسب نوع الطلب
  const getAvailableStatuses = () => {
    if (orderType === "take_away") return TAKE_AWAY_STATUSES;
    if (orderType === "delivery") return DELIVERY_STATUSES;
    if (orderType === "dine_in") return DINE_IN_STATUSES; // أو return {} لو مش عايزة أزرار للـ dine_in
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
          {filteredOrders.map((order) => (
            <Card key={order.id} className="border shadow-sm bg-white flex flex-col h-full">
              <CardContent className="p-4 space-y-3 flex-grow">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-lg">#{order.order_number}</h3>

                  {/* أزرار تغيير الحالة (مخفية للـ dine_in لو مش عايزاها) */}
                  {orderType !== "dine_in" && (
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(getAvailableStatuses()).map(([key, value]) => {
                        const isActive = statuses[order.id] === key;
                        return (
                          <Button
                            key={key}
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={`${value.color}`}
                            disabled={updatingStatus[order.id]}
                            onClick={() => handleStatusChange(order.id, key)}
                          >
                            <value.icon size={16} className="mr-1" />
                            {t(value.label)}
                          </Button>
                        );
                      })}
                    </div>
                  )}

                  {/* لو عايزة أزرار للـ dine_in برضو، احذفي الشرط فوق وخليها تظهر دايماً */}
                </div>

                <p className="text-sm text-gray-500">
                  {order.order_date} — {order.date}
                </p>

                <div className="space-y-1">
                  <p className="text-sm font-medium">{t("Items")}:</p>
                  <ul className="list-disc list-inside text-sm text-gray-700">
                    {order.order_details?.map((detail, i) =>
                      detail.product?.map((prod, j) => (
                        <li key={`${i}-${j}`}>
                          {prod.product.name} × {prod.count}
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}