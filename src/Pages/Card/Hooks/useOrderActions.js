import { toast } from "react-toastify";
import { buildProductPayload } from "@/services/productProcessor";
import { PREPARATION_STATUSES } from "../constants";
import { processProductItem } from "@/Pages/Checkout/processProductItem";

export function useOrderActions({
  orderItems,
  updateOrderItems,
  tableId,
  postData,
  navigate,
  t,
  notes,
  setNotes,
  setItemLoadingStates,
}) {
  const handleIncrease = (itemTempId) => {
    const updatedItems = orderItems.map((item) =>
      item.temp_id === itemTempId ? { ...item, count: (item.count || 0) + 1 } : item
    );
    updateOrderItems(updatedItems);
  };

  const handleDecrease = (itemTempId) => {
    const updatedItems = orderItems
      .map((item) => {
        if (item.temp_id === itemTempId) {
          const newCount = (item.count || 0) - 1;
          return newCount > 0 || item.preparation_status === "done"
            ? { ...item, count: Math.max(newCount, 1) }
            : null;
        }
        return item;
      })
      .filter(Boolean);
    updateOrderItems(updatedItems);
  };

  const handleRemoveFrontOnly = (temp_id) => {
    const updatedItems = orderItems.filter((item) => item.temp_id !== temp_id);
    updateOrderItems(updatedItems);
    toast.success(t("Itemremovedsuccessfully"));
  };

  const handleUpdatePreparationStatus = async (itemTempId) => {
    const itemToUpdate = orderItems.find((item) => item.temp_id === itemTempId);

    if (!itemToUpdate) {
      toast.error("المنتج غير موجود");
      return;
    }

    if (!itemToUpdate.cart_id) {
      toast.error("لا يمكن تحديث الحالة: المنتج غير موجود على الخادم");
      return;
    }

    const currentStatus = itemToUpdate.preparation_status || "pending";
    const nextStatus = PREPARATION_STATUSES[currentStatus]?.nextStatus;

    if (!nextStatus || !PREPARATION_STATUSES[nextStatus]?.canSendToAPI) {
      toast.info("لا يمكن تحديث هذه الحالة الآن");
      return;
    }

    setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: true }));

    const formData = new FormData();
    formData.append("table_id", tableId);

    const cartIds = Array.isArray(itemToUpdate.cart_id)
      ? itemToUpdate.cart_id
      : [itemToUpdate.cart_id.toString()];

    cartIds.forEach((id, index) => {
      formData.append(`preparing[${index}][cart_id]`, id);
      formData.append(
        `preparing[${index}][status]`,
        PREPARATION_STATUSES[nextStatus].apiValue || nextStatus
      );
      formData.append(`preparing[${index}][count]`, itemToUpdate.count || 1);
    });

    try {
      await postData("cashier/preparing", formData);

      const updatedItems = orderItems.map((item) =>
        item.temp_id === itemTempId
          ? { ...item, preparation_status: nextStatus }
          : item
      );

      updateOrderItems(updatedItems);
      toast.success(`تم تحديث الحالة إلى ${PREPARATION_STATUSES[nextStatus].label}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "فشل تحديث الحالة");
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [itemTempId]: false }));
    }
  };

  // داخل useOrderActions.js

  const confirmVoidItem = async (
    voidItemId,
    managerId, // يمكن أن يكون null
    managerPassword, // يمكن أن يكون null
    onSuccess
  ) => {
    const itemToVoid = orderItems.find((item) => item.temp_id === voidItemId);

    // التحقق: إذا لم يكن هناك cart_id لا يمكن الحذف من السيرفر
    if (!itemToVoid?.cart_id || !tableId) {
      toast.error(t("ItemNotFoundOrNotSynced"));
      return;
    }

    setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: true }));

    const formData = new FormData();

    // تحويل cart_id إلى مصفوفة وإضافتها
    const cartIds = Array.isArray(itemToVoid.cart_id)
      ? itemToVoid.cart_id
      : typeof itemToVoid.cart_id === "string"
        ? itemToVoid.cart_id.split(",").map((id) => id.trim())
        : [itemToVoid.cart_id];

    cartIds.forEach((id) => formData.append("cart_ids[]", id.toString()));
    formData.append("table_id", tableId.toString());

    // 🟢 إضافة بيانات المدير فقط إذا وجدت (في حال كان المنتج قيد التحضير)
    if (managerId) formData.append("manager_id", managerId);
    if (managerPassword) formData.append("manager_password", managerPassword);

    try {
      await postData("cashier/order_void", formData);

      const updatedItems = orderItems.filter((item) => item.temp_id !== voidItemId);
      updateOrderItems(updatedItems);

      toast.success(t("Itemvoidedsuccessfully"));
      if (onSuccess) onSuccess();
    } catch (err) {
      let errorMessage = t("FailedToVoidItem");
      if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage = t("InvalidManagerIDorPasswordAccessdenied");
      }
      toast.error(errorMessage);
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, [voidItemId]: false }));
    }
  };

  const applyBulkStatus = async (
    selectedItems,
    bulkStatus,
    setBulkStatus,
    setSelectedItems
  ) => {
    // التحقق من وجود عناصر للتحديث
    const itemsToUpdate = orderItems.filter((item) =>
      selectedItems.includes(item.temp_id)
    );

    if (itemsToUpdate.length === 0) {
      toast.warning(t("Novaliditemstoupdate"));
      return;
    }

    // تصفية العناصر التي تحتاج لإرسال للباك إند
    const itemsForApi = itemsToUpdate.filter(
      (item) => PREPARATION_STATUSES[bulkStatus]?.canSendToAPI && item.cart_id
    );

    let apiResponse = null; // متغير لحفظ الرد

    if (itemsForApi.length > 0) {
      const formData = new FormData();
      formData.append("table_id", tableId.toString());
      itemsForApi.forEach((item, index) => {
        formData.append(`preparing[${index}][cart_id]`, item.cart_id.toString());
        formData.append(
          `preparing[${index}][status]`,
          PREPARATION_STATUSES[bulkStatus].apiValue
        );
        formData.append(`preparing[${index}][count]`, item.count || 1);
      });

      try {
        // ✅ تعديل: استلام الرد من السيرفر
        apiResponse = await postData("cashier/preparing", formData);

        toast.success(
          `Successfully updated ${itemsForApi.length} items to ${PREPARATION_STATUSES[bulkStatus].label}`
        );
      } catch (err) {
        toast.error(err.response?.data?.message || t("Failedtoupdatestatus"));
        return null; // توقف في حالة الخطأ
      }
    }

    // تحديث الحالة في الواجهة الأمامية (UI)
    const updatedItems = orderItems.map((item) =>
      selectedItems.includes(item.temp_id)
        ? { ...item, preparation_status: bulkStatus }
        : item
    );

    updateOrderItems(updatedItems);
    setSelectedItems([]);
    setBulkStatus("");

    // ✅ التعديل الأهم: إرجاع الرد لكي تراه دالة الطباعة في BulkActionsBar
    return apiResponse;
  };

  const handleTransferOrder = (selectedTempIds = []) => {
    // 1. التحقق من وجود عناصر مختارة
    if (selectedTempIds.length === 0) {
      toast.warning(t("Pleaseselectitemstotransfer"));
      return;
    }

    // 2. تجميع الـ cart_ids
    const selectedCartIds = orderItems
      .filter((item) => selectedTempIds.includes(item.temp_id))
      .flatMap((item) => {
        if (Array.isArray(item.cart_id)) return item.cart_id;
        if (typeof item.cart_id === "string")
          return item.cart_id.split(",").map((id) => id.trim());
        if (item.cart_id) return [item.cart_id.toString()];
        return [];
      })
      .filter(Boolean);

    if (selectedCartIds.length === 0) {
      toast.error(t("NovalidcartIDsfoundforselecteditems"));
      return;
    }

    if (!tableId) {
      toast.error(t("CannottransferorderTableIDismissing"));
      return;
    }

    // المنطق الفعلي للنقل يتم هنا بعد التأكيد
    localStorage.setItem("transfer_cart_ids", JSON.stringify(selectedCartIds));
    localStorage.setItem("transfer_source_table_id", tableId.toString());
    localStorage.setItem("transfer_pending", "true");

    toast.info(t("Pleaseselectanewtabletotransfertheselecteditems"));

    navigate("/", {
      state: {
        initiateTransfer: true,
        sourceTableId: tableId,
        cartIds: selectedCartIds,
        timestamp: Date.now(),
      },
      replace: false,
    });
  };
  const handleSaveAsPending = async (amountToPay, totalTax, prepareOrderValue = "0", orderPendingValue = "1") => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstosaveaspending"));
      return;
    }

    // ✅ استخدام المعالج (Processor) الخاص بك لتحويل المنتجات
    // هذا المعالج يضمن تحويل المصفوفات (extra_id, variation) إلى نصوص/أرقام فقط
    const productsToSend = orderItems.map(processProductItem);

    const payload = {
      amount: amountToPay.toString(),
      total_tax: totalTax.toString(),
      total_discount: "0",
      notes: notes || "",
      source: "web",
      financials: [],
      due: "0", // ✅ Required field for order_pending=0
      order_pending: orderPendingValue.toString(), // لإخباره أنه طلب معلق (أو لا)
      prepare_order: prepareOrderValue.toString(),
      cashier_id: localStorage.getItem("cashier_id") || "4",
      products: productsToSend,
    };

    // كونسول للتأكد قبل الإرسال أن المصفوفات ليست Objects
    console.log("📦 Sending Pending Payload:", payload);

    try {
      const response = await postData("cashier/take_away_order", payload, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("access_token")}`,
        },
      });

      console.log("✅ Save Pending Response:", response);

      toast.success(t("Ordersavedaspending"));

      // ✅ Case 2: Prepare & Pending → Print kitchen receipts immediately
      if (prepareOrderValue === "1" && orderPendingValue === "1" && response) {
        try {
          // Import the required functions at the component level
          const { printKitchenOnly, prepareReceiptData } = await import("@/Pages/utils/printReceipt");

          // Get orderType from localStorage
          const savedOrderType = localStorage.getItem("order_type") || "take_away";

          const receiptData = prepareReceiptData(
            orderItems,
            amountToPay,
            totalTax,
            0, // totalDiscount
            0, // appliedDiscount
            {}, // discountData
            savedOrderType,
            amountToPay,
            response.success,
            response
          );

          printKitchenOnly(receiptData, response, () => {
            console.log("✅ Kitchen receipts printed successfully");
          });
        } catch (printError) {
          console.error("❌ Kitchen Print Error:", printError);
          toast.warning("تم حفظ الطلب لكن فشلت طباعة المطبخ");
        }
      }

      updateOrderItems([]); // تفريغ السلة
      localStorage.removeItem("cart");
      localStorage.removeItem("pending_order_info");
    } catch (e) {
      console.error("❌ Save Pending Error:", e);
      console.error("❌ Error Response:", e.response);
      console.error("❌ Error Data:", e.response?.data);
      toast.error(e.response?.data?.errors || e.message || t("Failedtosaveaspending"));
    }
  };

  return {
    handleIncrease,
    handleDecrease,
    handleRemoveFrontOnly,
    handleUpdatePreparationStatus,
    confirmVoidItem,
    applyBulkStatus,
    handleTransferOrder,
    handleSaveAsPending,
  };
}