import React, { useState, useEffect, useCallback, useMemo } from "react";
import Delivery from "./Delivery/Delivery";
import Dine from "./Dine/Dine";
import TakeAway from "./TakeAway";
import OrderPage from "./OrderPage";
import { usePost } from "@/Hooks/usePost";
import { useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const getInitialState = () => {
  const storedOrderType = localStorage.getItem("order_type") || "take_away";
  const storedTab = localStorage.getItem("tab") || storedOrderType;
  const storedTableId = localStorage.getItem("table_id") || null;
  const storedDeliveryUserId = localStorage.getItem("selected_user_id") || null;
  const transferSourceTableId = localStorage.getItem("transfer_source_table_id") || null;
  const transferCartIds = JSON.parse(localStorage.getItem("transfer_cart_ids")) || null;
  const isTransferring = !!(transferSourceTableId && transferCartIds && transferCartIds.length > 0);

  return {
    tabValue: storedTab,
    orderType: storedOrderType,
    tableId: storedTableId,
    deliveryUserId: storedDeliveryUserId,
    isTransferring,
    transferSourceTableId,
    transferCartIds,
  };
};

const clearTransferData = () => {
  localStorage.removeItem("transfer_source_table_id");
  localStorage.removeItem("transfer_first_cart_id");
  localStorage.removeItem("transfer_cart_ids");
};

export default function Home() {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const location = useLocation();
  const [state, setState] = useState(getInitialState);

  const initialState = useMemo(() => getInitialState(), [location.key]);

  useEffect(() => {
    setState((prevState) => {
      const newState = { ...prevState, ...initialState };

      // Update if tabValue, deliveryUserId, or tableId changed
      const hasChanged =
        newState.tabValue !== prevState.tabValue ||
        newState.deliveryUserId !== prevState.deliveryUserId ||
        newState.tableId !== prevState.tableId;

      return hasChanged ? newState : prevState;
    });
  }, [initialState]);

  // ✅ FIXED: Handle repeated orders from SinglePage and Delivery
  useEffect(() => {
    const { state: locationState } = location;

    // Check if this is a repeat order
    const isRepeat = locationState?.repeatedOrder;

    if (isRepeat && locationState?.tabValue === "take_away") {
      setState((prevState) => ({
        ...prevState,
        orderType: "take_away",
        tabValue: "take_away",
      }));
      return;
    }

    if (isRepeat && (locationState?.tabValue === "delivery" || locationState?.orderType === "delivery")) {
      setState((prevState) => ({
        ...prevState,
        orderType: "delivery",
        tabValue: "delivery",
        deliveryUserId: locationState.userId || prevState.deliveryUserId,
      }));
      if (locationState.userId) {
        localStorage.setItem("selected_user_id", locationState.userId);
      }
      return;
    }

    // Normal navigation with userId
    if (locationState && locationState.userId) {
      setState((prevState) => ({
        ...prevState,
        deliveryUserId: locationState.userId,
        orderType: locationState.orderType || "delivery",
        tabValue: locationState.orderType || "delivery",
      }));
      localStorage.setItem("selected_user_id", locationState.userId);
      localStorage.setItem("order_type", locationState.orderType || "delivery");
      localStorage.setItem("tab", locationState.orderType || "delivery");
      return;
    }

    // Default: clear cart if not a repeat order and not selecting a user
    // if (!isRepeat && !locationState?.userId) {
    //   localStorage.removeItem("cart");
    // }
  }, [location]);

  const { postData, loading: transferLoading } = usePost();

  const fetchDiscount = useCallback(async () => {
    const cachedDiscount = localStorage.getItem("discount_data");
    if (cachedDiscount) return;

    try {
      const branch_id = localStorage.getItem("branch_id") || "4";
      const response = await postData("cashier/discount_module", {
        branch_id: branch_id,
        type: "web", // هنا بنبعت type: web زي ما عاوزة
      }); console.log("Discount API Response:", response);
      const discountData = {
        discount: response?.discount || 0,
        module: response?.module || [],
      };
      localStorage.setItem("discount_data", JSON.stringify(discountData));
    } catch (error) {
      console.error("Error fetching discount:", error);
      toast.error(t("Failedtofetchdiscountdata"));
      localStorage.setItem("discount_data", JSON.stringify({ discount: 0, module: [] }));
    }
  }, [postData, t]);

  useEffect(() => {
    fetchDiscount();
  }, [fetchDiscount]);

  const runTransferAPI = useCallback(
    async (newTableId, sourceTableId, cartIds) => {
      if (!newTableId || !sourceTableId || !cartIds || cartIds.length === 0) {
        toast.error(t("IncompletetransferdataCannotcompletetransfer"));
        clearTransferData();
        return;
      }

      const formData = new FormData();
      formData.append("source_table_id", sourceTableId.toString());
      formData.append("new_table_id", newTableId.toString());
      cartIds.forEach((cart_id, index) => {
        formData.append(`cart_ids[${index}]`, cart_id.toString());
      });

      try {
        console.log("Starting Transfer API call...", { sourceTableId, newTableId, cartIds });

        const response = await postData("cashier/complete_transfer_order", formData);

        // ✅ تحديث المعرف الرقمي
        localStorage.setItem("table_id", newTableId);

        // ✅ التعديل الأساسي: تحديث رقم الطاولة من الرد القادم من السيرفر
        // إذا كان السيرفر يرسل رقم الطاولة في الاستجابة (مثلاً table_number)
        if (response?.table_number) {
          localStorage.setItem("table_number", response.table_number);
        }
        // ملحوظة: إذا كان السيرفر لا يرسل الرقم، يفضل جلب الرقم من كائن الطاولة المختار قبل مناداة الـ API

        toast.success(t("OrderTransferred", { sourceTableId, newTableId }));
        clearTransferData();

        setState((prevState) => ({
          ...prevState,
          tableId: newTableId,
          orderType: "dine_in",
          tabValue: "dine_in",
          isTransferring: false,
          transferSourceTableId: null,
          transferCartIds: null,
        }));

        // إعادة تحميل الصفحة لضمان تحديث كافة مكونات الواجهة (DineInformation, Header.. الخ)
        setTimeout(() => {
          window.location.reload();
        }, 500);

      } catch (error) {
        console.error("Transfer API Failed:", error);
        const errorMessage = error.response?.data?.message || t("FailedtocompletetransferPleasetryagain");
        toast.error(errorMessage);
        clearTransferData();
        setState((prevState) => ({
          ...prevState,
          isTransferring: false,
        }));
      }
    },
    [postData, t]
  );



  const handleTableSelect = useCallback((tableObj) => {
    // التأكد من استخراج البيانات سواء كان المرسل ID فقط أو Object
    const newTableId = typeof tableObj === 'object' ? tableObj.id : tableObj;
    const newTableNumber = tableObj?.table_number || tableObj?.name; // حسب المسمى عندك في مصفوفة الطاولات

    const sourceTableId = localStorage.getItem("transfer_source_table_id");
    const cartIds = JSON.parse(localStorage.getItem("transfer_cart_ids"));

    if (state.isTransferring) {
      if (!sourceTableId || !cartIds || cartIds.length === 0) {
        toast.error(t("CannottransferorderTableIDorCartIDsaremissing"));
        clearTransferData();
        setState(prev => ({ ...prev, isTransferring: false }));
        return;
      }

      // ✅ تخزين رقم الطاولة الجديد فوراً قبل مناداة الـ API لضمان التحديث
      if (newTableNumber) {
        localStorage.setItem("table_number", newTableNumber);
      }

      runTransferAPI(newTableId, sourceTableId, cartIds);
    } else {
      // المنطق الطبيعي
      setState((prevState) => ({
        ...prevState,
        tableId: newTableId,
        orderType: "dine_in",
        tabValue: "dine_in",
      }));
      localStorage.setItem("table_id", newTableId);
      if (newTableNumber) {
        localStorage.setItem("table_number", newTableNumber);
      }
      localStorage.setItem("order_type", "dine_in");
      localStorage.setItem("tab", "dine_in");
    }
  }, [state.isTransferring, runTransferAPI, t]);

  const handleDeliveryUserSelect = useCallback((id) => {
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: id,
      orderType: "delivery",
      tabValue: "delivery",
    }));
    localStorage.setItem("delivery_user_id", id);
    localStorage.setItem("order_type", "delivery");
    localStorage.setItem("tab", "delivery");
  }, []);

  const handleClose = useCallback(() => {
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("order_type");
    setState((prevState) => ({
      ...prevState,
      deliveryUserId: null,
      orderType: "delivery",
      tabValue: "delivery"
    }));
  }, []);

  console.log("Home Component State:", state);

  const dineInContent = useMemo(() => {
    if (state.isTransferring || !state.tableId) {
      return <Dine onTableSelect={handleTableSelect} isTransferring={state.isTransferring} />;
    }
    return <OrderPage propOrderType="dine_in" propTableId={state.tableId} />;
  }, [state.isTransferring, state.tableId, handleTableSelect]);

  return (
    <div className="min-h-screen bg-white flex flex-col items-center">
      {/* عرض المحتوى بناءً على الـ tab الحالي */}
      {state.tabValue === "take_away" && (
        <TakeAway orderType={state.orderType} />
      )}

      {state.tabValue === "delivery" && (
        <>
          {state.deliveryUserId ? (
            <OrderPage propOrderType="delivery" propUserId={state.deliveryUserId} onClose={handleClose} />
          ) : (
            <Delivery onCustomerSelect={handleDeliveryUserSelect} />
          )}
        </>
      )}

      {state.tabValue === "dine_in" && dineInContent}
    </div>
  );
}