import { useGet } from "@/Hooks/useGet"; // أو المسار الصح
import { useEffect } from "react";

const NotificationsPage = () => {
  const { data, refetch } = useGet("cashier/orders/notifications", { useCache: false }); // نطفي الكاش عشان live

  const notifications = data?.orders || [];
  const count = data?.orders_count || 0;

  // نستمع للـ event ونعمل refetch
  useEffect(() => {
    const handler = () => {
      refetch(); // ريفريش فوري
    };
    window.addEventListener("new-order-received", handler);
    return () => window.removeEventListener("new-order-received", handler);
  }, [refetch]);

  return (
    <div>
      <h2>الإشعارات ({count})</h2>
      {notifications.map(orderId => (
        <NotificationOrderCard key={orderId} orderId={orderId} /* باقي الـ props */ />
      ))}
    </div>
  );
};
export default NotificationsPage;