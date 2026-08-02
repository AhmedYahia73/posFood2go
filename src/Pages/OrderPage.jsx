import React, { useEffect, useState } from "react";
import Card from "./Card/Card";
import Item from "./Item";
import { useLocation, useNavigate } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { areProductsEqual } from "./ProductModal";
import { useTranslation } from "react-i18next";

export default function OrderPage({
  fetchEndpoint,
  initialCart = [],
  allowQuantityEdit = true,
  propOrderType,
  propTableId,
  propUserId,
  onClose,
  discountData = { discount: 0, module: [] },
}) {
  const { i18n } = useTranslation()
  const locale = i18n.language === "ar" ? "ar" : "en";
  const isArabic = i18n.language === "ar";
  const [ordersByTable, setOrdersByTable] = useState({});
  const [ordersByUser, setOrdersByUser] = useState({});
  const [takeAwayItems, setTakeAwayItems] = useState(initialCart);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [pendingOrderLoaded, setPendingOrderLoaded] = useState(false);
  
  // ✅ State للـ pending order info (بدلاً من localStorage)
  const [pendingOrderInfo, setPendingOrderInfo] = useState(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const pendingOrder = location.state?.pendingOrder;

  const currentOrderType = propOrderType || location.state?.orderType || localStorage.getItem("order_type") || "take_away";
  const currentTableId = propTableId || location.state?.tableId || localStorage.getItem("table_id") || null;
  const currentUserId = propUserId || location.state?.delivery_user_id || localStorage.getItem("delivery_user_id") || null;

  const isDineIn = currentOrderType === "dine_in" && !!currentTableId;
  const isDelivery = currentOrderType === "delivery" && !!currentUserId;

  const { data: dineInData, loading: dineInLoading, refetch: refetchDineIn } = useGet(
    isDineIn && currentTableId ? `cashier/dine_in_table_order/${currentTableId}?locale=${locale}` : null
  );

  // ✅ FIXED: تحميل الطلب من API state (مش localStorage)
  useEffect(() => {
    if (pendingOrder && pendingOrder.orderDetails && !pendingOrderLoaded) {
      console.log("📦 Loading pending order from API state:", pendingOrder);
      
      // ✅ استخدام البيانات من الـ API مباشرة (بدون تحويل زيادة)
      const mappedItems = pendingOrder.orderDetails.map((detail) => ({
        // ✅ نستخدم كل البيانات من الـ API مباشرة
        ...detail,
        // فقط نتأكد من وجود الـ temp_id
        temp_id: detail.temp_id || `pending_${detail.id}_${Date.now()}`,
      }));

      setTakeAwayItems(mappedItems);
      setPendingOrderLoaded(true);
      
      // ✅ حفظ الـ order info في state (بدلاً من localStorage)
      setPendingOrderInfo({
        orderId: pendingOrder.orderId,
        orderNumber: pendingOrder.orderNumber,
        amount: pendingOrder.totalAmount,
        notes: pendingOrder.notes,
        prepare_order: pendingOrder.prepare_order || "0",
      });

      // ❌ نشيل localStorage تماماً
      // localStorage.setItem("cart", JSON.stringify(mappedItems));
      // localStorage.setItem("order_type", "take_away");
      // localStorage.setItem("pending_order_info", JSON.stringify({...}));
      
      console.log("✅ Pending order loaded from API:", mappedItems);
    } else if (!pendingOrderLoaded && currentOrderType === "take_away" && !location.state?.fromPendingOrders) {
      // فقط لو مش جايين من pending orders، نجرب نقرا من localStorage (للـ backward compatibility)
      const storedCartString = localStorage.getItem("cart");
      if (storedCartString && storedCartString !== "undefined") {
        try {
          const storedCart = JSON.parse(storedCartString);
          console.log("📦 Loading cart from localStorage in OrderPage:", storedCart);
          setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
        } catch (error) {
          console.error("Error parsing cart JSON from localStorage:", error);
          setTakeAwayItems([]);
        }
      }
    }
  }, [pendingOrder, pendingOrderLoaded, currentOrderType, location.state?.fromPendingOrders]);

  // dine-in: أضف originalPrice و temp_id
  useEffect(() => {
    if (isDineIn && currentTableId && dineInData?.success) {
      const mappedItems = Array.isArray(dineInData.success)
        ? dineInData.success.map((item) => ({
          ...item,
          originalPrice: item.originalPrice ?? item.price ?? 0,
          temp_id: item.temp_id || `dinein_${item.id}_${Date.now()}`,
          count: parseFloat(item.count || 1), price: parseFloat(item.price || 0),
          preparation_status: item.prepration || item.preparation_status || "pending",
        }))
        : [];

      setOrdersByTable((prev) => ({
        ...prev,
        [currentTableId]: mappedItems,
      }));
    }
  }, [isDineIn, currentTableId, dineInData]);

  // delivery: أضف originalPrice و temp_id
  // delivery: أضف originalPrice و temp_id + القراءة من localStorage عند الريفريش
  useEffect(() => {
    if (isDelivery && currentUserId) {
      // 1. لو فيه داتا جاية من السيرفر (الطلب محفوظ مسبقاً)
      if (dineInData?.success) {
        const mappedItems = Array.isArray(dineInData.success)
          ? dineInData.success.map((item) => ({
            ...item,
            originalPrice: item.originalPrice ?? item.price ?? 0,
            temp_id: item.temp_id || `delivery_${item.id}_${Date.now()}`,
            count: parseFloat(item.count || 1), price: parseFloat(item.price || 0),
            preparation_status: item.prepration || item.preparation_status || "pending",
          }))
          : [];

        setOrdersByUser((prev) => ({
          ...prev,
          [currentUserId]: mappedItems,
        }));

        // تحديث السيشين بالداتا اللي جت من السيرفر عشان تفضل معانا
        localStorage.setItem("cart", JSON.stringify(mappedItems));
      }
      // 2. 🟢 الجزء الجديد: لو مفيش داتا من السيرفر (زي حالة الريفريش لطلب جديد)
      else {
        const storedCart = localStorage.getItem("cart");
        if (storedCart && storedCart !== "undefined") {
          try {
            const parsedCart = JSON.parse(storedCart);
            // نتأكد إننا مش بنمسح داتا موجودة أصلاً في الـ state
            setOrdersByUser((prev) => {
              if (!prev[currentUserId] || prev[currentUserId].length === 0) {
                return {
                  ...prev,
                  [currentUserId]: parsedCart,
                };
              }
              return prev;
            });
          } catch (error) {
            console.error("Error parsing stored cart:", error);
          }
        }
      }
    }
  }, [isDelivery, currentUserId, dineInData]);

  const clearOrderData = () => {
    if (currentOrderType === "take_away") {
      setTakeAwayItems([]);
      localStorage.removeItem("cart");
      localStorage.removeItem("cart_take_away");
      localStorage.removeItem("pending_order_info");
    } else if (currentOrderType === "dine_in" && currentTableId) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: [] }));
    } else if (currentOrderType === "delivery" && currentUserId) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: [] }));
      localStorage.removeItem("cart");
      localStorage.removeItem("cart_delivery");
      localStorage.removeItem("selected_user_id");
      localStorage.removeItem("selected_address_id");
    }
  };

  const refreshCartData = async () => {
    try {
      setIsLoading(true);
      if (isDineIn && currentTableId && refetchDineIn) {
        await refetchDineIn();
      } else if (currentOrderType === "take_away") {
        const storedCartString = localStorage.getItem("cart");
        if (storedCartString && storedCartString !== "undefined") {
          try {
            const storedCart = JSON.parse(storedCartString);
            console.log("🔄 Refreshing cart from localStorage:", storedCart);
            setTakeAwayItems(Array.isArray(storedCart) ? storedCart : []);
          } catch (error) {
            console.error("Error parsing cart JSON:", error);
            setTakeAwayItems([]);
          }
        }
      }
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      console.error("Error refreshing cart data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const currentOrderItems = isDineIn
    ? ordersByTable[currentTableId] || []
    : isDelivery
      ? ordersByUser[currentUserId] || []
      : takeAwayItems;

  const updateOrderItems = (newItems) => {
    const safeNewItems = Array.isArray(newItems) ? newItems : [];

    // 1. تحديث الـ State حسب النوع
    if (isDineIn) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: safeNewItems }));
    } else if (isDelivery) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: safeNewItems }));
    } else {
      setTakeAwayItems(safeNewItems);
    }

    // 2. 🟢 المزامنة مع localStorage لكل الحالات لضمان وجود cart_id دائماً
    localStorage.setItem("cart", JSON.stringify(safeNewItems));
    console.log("💾 Updated cart in localStorage (updateOrderItems):", safeNewItems.length, "items");
  };
  const handleAddItem = (item) => {
    // 1. تحقق إذا كان المنتج قادم من الميزان
    const isScaleItem = item._source === "scale_barcode";

    if (currentOrderType === "dine_in") {
      setOrdersByTable((prev) => {
        const tableId = currentTableId;
        const currentItems = prev[tableId] || [];

        // 2. إذا كان منتج ميزان، أضفه فوراً كسطر جديد دون بحث عن تكرار
        if (isScaleItem) {
          return {
            ...prev,
            [tableId]: [...currentItems, { ...item }],
          };
        }

        // المنطق القديم للمنتجات العادية (دمج الكميات)
        const existingItemIndex = currentItems.findIndex((i) =>
          areProductsEqual(i, item)
        );

        if (existingItemIndex > -1) {
          const updatedItems = [...currentItems];
          const addedCount = parseFloat(item.count || 1);
          updatedItems[existingItemIndex].count += addedCount;
          updatedItems[existingItemIndex].quantity = (updatedItems[existingItemIndex].quantity || 0) + addedCount;
          return { ...prev, [tableId]: updatedItems };
        }
        return { ...prev, [tableId]: [...currentItems, item] };
      });
    } else {
      // --- الجزء الخاص بالـ Takeaway و Delivery ---

      // أ- تحديث الـ takeAwayItems (عشان الـ Takeaway يفضل شغال)
      setTakeAwayItems((prev) => {
        let newItems;
        if (isScaleItem) {
          newItems = [...prev, { ...item }];
        } else {
          const existingItemIndex = prev.findIndex((i) => areProductsEqual(i, item));
          if (existingItemIndex > -1) {
            const updatedItems = [...prev];
            const addedCount = parseFloat(item.count || 1);
            updatedItems[existingItemIndex].count += addedCount;
            updatedItems[existingItemIndex].quantity = (updatedItems[existingItemIndex].quantity || 0) + addedCount;
            newItems = updatedItems;
          } else {
            newItems = [...prev, item];
          }
        }
        localStorage.setItem("cart", JSON.stringify(newItems));
        return newItems;
      });

      // ب- تحديث الـ ordersByUser (عشان الـ Delivery يظهر في الـ Card)
      if (currentUserId) {
        setOrdersByUser((prev) => {
          const userId = currentUserId;
          const currentItems = prev[userId] || [];
          let newItems;

          if (isScaleItem) {
            newItems = [...currentItems, { ...item }];
          } else {
            const existingItemIndex = currentItems.findIndex((i) =>
              areProductsEqual(i, item)
            );

            if (existingItemIndex > -1) {
              const updatedItems = [...currentItems];
              const addedCount = parseFloat(item.count || 1);
              updatedItems[existingItemIndex].count += addedCount;
              updatedItems[existingItemIndex].quantity = (updatedItems[existingItemIndex].quantity || 0) + addedCount;
              newItems = updatedItems;
            } else {
              newItems = [...currentItems, item];
            }
          }
          localStorage.setItem("cart", JSON.stringify(newItems));
          return {
            ...prev,
            [userId]: newItems,
          };
        });
      }
    }

    // لضمان تحديث الواجهة
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleClose = () => {
    // إذا تم تمرير onClose من الأب (Home.jsx)، نستخدمها
    // لأنها تحتوي على المنطق الصحيح للعودة لقائمة الديليفري دون تغيير التبويب
    if (onClose) {
      onClose();
      return;
    }

    // هذا الكود الاحتياطي يعمل فقط إذا لم يتم تمرير onClose
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("order_type");
    localStorage.removeItem("table_id");
    localStorage.removeItem("delivery_user_id");
    localStorage.removeItem("cart");
    localStorage.removeItem("pending_order_info");
    setPendingOrderLoaded(false);
    navigate("/");
  };

  const handleClearCart = () => {
    console.log("🧹 Clearing cart due to price type change");

    // مسح الـ state حسب نوع الطلب
    if (isDineIn) {
      setOrdersByTable((prev) => ({ ...prev, [currentTableId]: [] }));
    } else if (isDelivery) {
      setOrdersByUser((prev) => ({ ...prev, [currentUserId]: [] }));
    } else {
      setTakeAwayItems([]);
    }

    // مسح الـ localStorage
    localStorage.setItem("cart", JSON.stringify([]));
    localStorage.removeItem(`cart_${currentOrderType}`);

    console.log("✅ Cart cleared successfully");
  };

  console.log("📋 OrderPage Current Items:", currentOrderItems);
  console.log("🎯 OrderPage Order Type:", currentOrderType);

  return (
    <div className="flex flex-col-reverse lg:flex-row gap-4 p-4 h-full  w-full" dir={isArabic ? "ltr" : "rtl"}>
      <div className="w-full lg:w-[25%] ">
        <Card
          key={refreshTrigger}
          onClose={onClose}
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          allowQuantityEdit={allowQuantityEdit}
          orderType={currentOrderType}
          clearOrderData={clearOrderData}
          tableId={currentTableId}
          userId={currentUserId}
          isLoading={dineInLoading || isLoading}
          discountData={discountData}
          pendingOrderInfo={pendingOrderInfo} // ✅ بعت الـ pending order info
        />
      </div>
      <div className="w-full lg:w-[75%]  lg:mt-0">
        <Item
          onAddToOrder={handleAddItem}
          onClearCart={handleClearCart}
          fetchEndpoint={fetchEndpoint}
          onClose={handleClose}
          refreshCartData={refreshCartData}
          orderItems={currentOrderItems}
          updateOrderItems={updateOrderItems}
          cartHasItems={currentOrderItems.length > 0}
        />
      </div>
    </div>
  );
}