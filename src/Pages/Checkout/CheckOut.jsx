import { getCurrencySymbol } from '../../utils/currency';
import React, { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import qz from "qz-tray";
import CustomerSelectionModal from "./CustomerSelectionModal";
import DeliveryAssignmentModal from "./DeliveryAssignmentModal";
import {
  buildFinancialsPayload,
  getOrderEndpoint,
  buildOrderPayload,
  buildDealPayload,
  validatePaymentSplits,
  calculateTotalItemDiscounts,
} from "./processProductItem";
import {
  prepareReceiptData,
  printReceiptSilently,
} from "../utils/printReceipt";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
const CheckOut = ({
  amountToPay,
  orderItems,
  onClose,
  totalTax,
  totalDiscount,
  source = "web",
  totalDineInItems,
  orderType,
  selectedPaymentItemIds = [],
  clearPaidItemsOnly,
  onClearCart,
  service_fees,
  notes,
  setNotes,
  setSelectedDiscountId,
  setFreeDiscount,
  selectedDiscountId,
  freeDiscount,
  freeDiscountPassword,
}) => {
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [pendingRepeatedPayload, setPendingRepeatedPayload] = useState(null);
  const cashierId = localStorage.getItem("cashier_id");
  const tableId = localStorage.getItem("table_id") || null;
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const isSubmitting = useRef(false);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const lastSelectedGroup = localStorage.getItem("last_selected_group");
  const { data: groupData } = useGet("cashier/group_product");
  const groupProducts = groupData?.group_product || [];
  const isDueModuleAllowed = useMemo(() => {
    if (!orderType || !groupProducts || groupProducts.length === 0)
      return false;

    if (!lastSelectedGroup || lastSelectedGroup === "all") return false;

    const groupId = parseInt(lastSelectedGroup);
    if (isNaN(groupId)) return false;

    const selectedGroup = groupProducts.find((g) => g.id === groupId);
    return selectedGroup?.due === 1;
  }, [orderType, groupProducts, lastSelectedGroup]);
  const { data: discountListData, loading: discountsLoading } = useGet(
    "captain/discount_list"
  );
  // === QZ Tray Connection ===
  useEffect(() => {
    // 1. لو إحنا في الإلكترون، اخرج فوراً مش محتاجين QZ
    if (window.electronAPI) return;

    // 2. تأكدي إن مكتبة QZ موجودة (سواء عملتي لها import أو موجودة في الـ window)
    const qzInstance = typeof qz !== "undefined" ? qz : null;

    if (qzInstance && !qzInstance.websocket.isActive()) {
      // إعدادات الشهادة
      qzInstance.security.setCertificatePromise((resolve, reject) => {
        fetch("/point-of-sale/digital-certificate.txt")
          .then((response) => response.text())
          .then(resolve)
          .catch(reject);
      });

      qzInstance.security.setSignatureAlgorithm("SHA512");

      // إعدادات التوقيع
      qzInstance.security.setSignaturePromise((toSign) => {
        return (resolve, reject) => {
          // تأكدي إن الـ baseUrl متهيأة صح (تنتهي بـ /)
          fetch(`${baseUrl}api/sign-qz-request?request=${toSign}`)
            .then((res) => res.text())
            .then(resolve)
            .catch(reject);
        };
      });

      // الاتصال
      qzInstance.websocket.connect()
        .then(() => console.log("✅ Connected to QZ Tray from Browser"))
        .catch((err) => console.error("❌ QZ Connection error:", err));
    }
  }, [baseUrl, window.electronAPI]); // ضيفنا electronAPI في الـ dependencies للأمان

  const { data: deliveryData } = useGet("cashier/delivery_lists");
  const { postData } = usePost();
  const discountData = useMemo(() => {
    const storedDiscount = localStorage.getItem("discount_data");
    try {
      return storedDiscount
        ? JSON.parse(storedDiscount)
        : { discount: 0, module: [] };
    } catch (error) {
      console.error("Error parsing discount data from localStorage:", error);
      return { discount: 0, module: [] };
    }
  }, []);
  // 🟢 حساب خصم المنتجات الفردية (item-level discounts)
  const itemDiscountsAmount = useMemo(
    () => calculateTotalItemDiscounts(orderItems),
    [orderItems]
  );
  const { selectedDiscountAmount, finalSelectedDiscountId } = useMemo(() => {
    const discountList = discountListData?.discount_list || [];
    const selectedDiscount = discountList.find(
      (d) => d.id === selectedDiscountId
    );

    if (!selectedDiscount) {
      return { selectedDiscountAmount: 0, finalSelectedDiscountId: null };
    }

    let discountValue = 0;
    if (selectedDiscount.type === "precentage") {
      discountValue = amountToPay * (selectedDiscount.amount / 100);
    } else if (selectedDiscount.type === "value") {
      discountValue = selectedDiscount.amount;
    }

    return {
      selectedDiscountAmount: discountValue,
      finalSelectedDiscountId: selectedDiscount.id,
    };
  }, [discountListData, selectedDiscountId, amountToPay]);
  // 🟢 حساب قيمة الخصم الـ percentage/value (كوبون أو قائمة أو module) - بدون الـ free
  const percentageDiscountAmount = useMemo(() => {
    let val = 0;

    if (appliedDiscount > 0) {
      val = amountToPay * (appliedDiscount / 100);
    } else if (discountData.module.includes(orderType)) {
      val = amountToPay * (discountData.discount / 100);
    } else if (selectedDiscountAmount > 0) {
      val = selectedDiscountAmount;
    }

    return val;
  }, [amountToPay, appliedDiscount, discountData, orderType, selectedDiscountAmount, selectedDiscountAmount]);

  // 🟢 الـ total_discount النهائي اللي هنبعته للباك (item discounts + percentage discounts + أي totalDiscount سابق)
  const finalTotalDiscount = useMemo(() => {
    const previous = parseFloat(totalDiscount || 0);
    return (itemDiscountsAmount + percentageDiscountAmount + previous).toFixed(2);
  }, [itemDiscountsAmount, percentageDiscountAmount, totalDiscount]);
  const [paymentSplits, setPaymentSplits] = useState([]);
  const [customerPaid, setCustomerPaid] = useState("");
  const [customerSelectionOpen, setCustomerSelectionOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");

  const {
    data: dueUsersData,
    loading: customerSearchLoading,
    refetch: refetchDueUsers,
  } = useGet(`cashier/list_due_users?search=${customerSearchQuery}`);

  const searchResults = useMemo(() => {
    const users = dueUsersData?.users || [];
    return users.filter(
      (c) =>
        c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
        c.phone.includes(customerSearchQuery) ||
        (c.phone_2 && c.phone_2.includes(customerSearchQuery))
    );
  }, [dueUsersData, customerSearchQuery]);

  // 🟢 حساب المبلغ بعد الخصم (مع إضافة free_discount)
  const discountedAmount = useMemo(() => {
    let totalDiscountValue = 0;

    // 1. تطبيق الخصم بالرمز (إذا كان مطبقاً)
    if (appliedDiscount > 0) {
      totalDiscountValue = amountToPay * (appliedDiscount / 100);
    }
    // 2. تطبيق الخصم الثابت بالـ module (إذا لم يكن هناك خصم بالرمز)
    else if (discountData.module.includes(orderType)) {
      totalDiscountValue = amountToPay * (discountData.discount / 100);
    }
    // 3. تطبيق الخصم المختار من القائمة (إذا لم يتم تطبيق خصم بالرمز أو خصم module)
    else if (selectedDiscountAmount > 0) {
      totalDiscountValue = selectedDiscountAmount;
    }

    // 4. 🟢 خصم الـ free_discount من المبلغ النهائي
    const afterPercentageDiscount = amountToPay - totalDiscountValue;
    const freeDiscountValue = parseFloat(freeDiscount) || 0;

    return Math.max(0, afterPercentageDiscount - freeDiscountValue);
  }, [
    amountToPay,
    orderType,
    discountData,
    appliedDiscount,
    selectedDiscountAmount,
    freeDiscount,
  ]);

  const totalAppliedDiscount = useMemo(() => {
    const additionalDiscount = amountToPay - discountedAmount;
    const previousDiscount = totalDiscount || 0;
    return parseFloat(additionalDiscount + previousDiscount).toFixed(2);
  }, [amountToPay, discountedAmount, totalDiscount]);
  const [deliveryModelOpen, setDeliveryModelOpen] = useState(false);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState(null);
  const [orderId, setOrderId] = useState(null);
  const [isDueOrder, setIsDueOrder] = useState(false);
  const [discountCode, setDiscountCode] = useState("");

  // CheckOut.jsx (الكود بعد التعديل)
  const requiredTotal = useMemo(() => {
    return discountedAmount;
  }, [discountedAmount]);

  const { totalScheduled, remainingAmount, changeAmount } = useMemo(() => {
    const sum = paymentSplits.reduce(
      (acc, split) => acc + (parseFloat(split.amount) || 0),
      0
    );
    const calculatedRemaining = requiredTotal - sum;
    const calculatedChange = sum - requiredTotal;

    return {
      totalScheduled: sum,
      remainingAmount: calculatedRemaining > 0 ? calculatedRemaining : 0,
      changeAmount: calculatedChange > 0 ? calculatedChange : 0,
    };
  }, [paymentSplits, requiredTotal]);

  const calculatedChange = useMemo(() => {
    const paid = parseFloat(customerPaid) || 0;
    return paid > requiredTotal ? paid - requiredTotal : 0;
  }, [customerPaid, requiredTotal]);

  const isTotalMet = totalScheduled >= requiredTotal;

  const financialAccounts = useMemo(() => {
    try {
      const stored = localStorage.getItem("financial_account");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      // لو البيانات مصفوفة جوا مصفوفة [[...]] زي ما في الصورة، هنفكها
      return Array.isArray(parsed) && Array.isArray(parsed[0]) ? parsed[0] : parsed;
    } catch (e) {
      console.error("Error parsing financial_account:", e);
      return [];
    }
  }, []);

  // Initialize default payment split - Default to Cash if available
  useEffect(() => {
    if (
      financialAccounts?.length > 0 &&
      paymentSplits.length === 0 &&
      requiredTotal > 0
    ) {
      // 🟢 Updated logic to look for "cash" instead of "visa"
      const cashAccount = financialAccounts.find((acc) =>
        acc.name?.toLowerCase().includes("cash") ||
        acc.name?.includes("كاش") // Added Arabic support just in case
      );

      const defaultAccountId = cashAccount
        ? cashAccount.id
        : financialAccounts[0].id;

      setPaymentSplits([
        {
          id: "split-1",
          accountId: defaultAccountId,
          amount: requiredTotal,
          checkout: "",
          transition_id: "",
        },
      ]);
    }
  }, [financialAccounts, requiredTotal, paymentSplits.length]);

  // Auto-update single split amount
  useEffect(() => {
    if (paymentSplits.length === 1 && paymentSplits[0].id === "split-1") {
      setPaymentSplits((prev) => {
        if (
          prev.length === 1 &&
          prev[0].id === "split-1" &&
          prev[0].amount !== requiredTotal
        ) {
          return prev.map((split) =>
            split.id === "split-1"
              ? { ...split, amount: requiredTotal || 0 }
              : split
          );
        }
        return prev;
      });
    }
  }, [requiredTotal]);

  const handleAmountChange = (id, value) => {
    const newAmount = parseFloat(value) || 0;
    if (newAmount < 0) {
      toast.error(t("AmountCannotBeNegative"));
      return;
    }

    setPaymentSplits((prevSplits) => {
      const totalExcludingCurrent = prevSplits.reduce(
        (acc, s) => (s.id === id ? acc : acc + s.amount),
        0
      );
      const maxAllowed = requiredTotal - totalExcludingCurrent;

      if (newAmount > maxAllowed) {
        toast.error(t("AmountExceedsLimit", { amount: maxAllowed.toFixed(2) }));
        return prevSplits.map((split) =>
          split.id === id ? { ...split, amount: maxAllowed } : split
        );
      }

      return prevSplits.map((split) =>
        split.id === id ? { ...split, amount: newAmount } : split
      );
    });
  };

  const handleAccountChange = (id, accountId) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id
          ? {
            ...split,
            accountId: parseInt(accountId),
            checkout: "",
            transition_id: "",
          }
          : split
      )
    );
  };

  const handleDescriptionChange = (id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, checkout: value } : split
      )
    );
  };

  const handleTransitionIdChange = (id, value) => {
    setPaymentSplits((prev) =>
      prev.map((split) =>
        split.id === id ? { ...split, transition_id: value } : split
      )
    );
  };

  const handleAddSplit = () => {
    if (!financialAccounts?.length) {
      return toast.error(t("NoFinancialAccounts"));
    }

    const defaultAccountId = financialAccounts[0].id;
    setPaymentSplits((prev) => [
      ...prev,
      {
        id: `split-${Date.now()}`,
        accountId: defaultAccountId,
        amount: remainingAmount > 0 ? remainingAmount : 0,
        checkout: "",
        transition_id: "",
      },
    ]);
  };

  const handleRemoveSplit = (id) => {
    setPaymentSplits((prev) => prev.filter((s) => s.id !== id));
  };

  const getDescriptionStatus = (accountId) => {
    const acc = financialAccounts?.find((a) => a.id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  const isVisaAccount = (accountId) => {
    const acc = financialAccounts?.find((a) => a.id === parseInt(accountId));
    return acc?.name?.toLowerCase().includes("visa");
  };

  const resetCheckoutState = () => {
    setAppliedDiscount(0);
    setSelectedDiscountId(null);
    setFreeDiscount("");
    setNotes("");
    setCustomerPaid("");
    setSelectedCustomer(null);
    setIsDueOrder(false);
    setPaymentSplits([]);
    setOrderId(null);
    // إذا كان هناك مبالغ أخرى تأتي من Props مثل amountToPay 
    // فيجب تصفيرها من المكون الأب (Parent) عبر دالة onClearCart
  };

  const proceedWithOrderSubmission = async (
    due = 0,
    customer_id = undefined,
    dueModuleValue = 0,
    forcedPassword = null,
    repeated = 0,
  ) => {
    // 🟢 1. تفعيل القفل والـ Loading فوراً
    isSubmitting.current = true;
    setLoading(true);

    const handleNavigation = (response) => {
      // 1. فك قفل الزر فوراً
      isSubmitting.current = false;
      setLoading(false);

      // 2. تصفير القيم المطلوبة (Amount / Discount)
      setAppliedDiscount(0);
      setSelectedDiscountId(null);
      setFreeDiscount("");
      setCustomerPaid("");
      setPaymentSplits([]); // لتصفير المبالغ المدفوعة في الـ Split

      if (orderType === "delivery") {
        localStorage.removeItem("selected_user_id");
        localStorage.removeItem("selected_user_data");
        localStorage.removeItem("selected_address_id");
        localStorage.removeItem("selected_address_data");
        setDeliveryModelOpen(false);
      }

      // 3. مسح السلة في المكون الأب
      if (orderType === "dine_in" && selectedPaymentItemIds.length > 0) {
        if (typeof clearPaidItemsOnly === 'function') clearPaidItemsOnly();
      } else {
        if (typeof onClearCart === 'function') onClearCart();
      }

      localStorage.setItem("last_order_type", orderType);

      if (orderType === "delivery" && response?.success?.id) {
        setOrderId(response.success.id);
        setDeliveryModelOpen(true);
      }
      localStorage.removeItem("selected_captain_id");
      localStorage.removeItem("selected_captain_name");
    };

    const freeDiscountValue = parseFloat(freeDiscount) || 0;
    const finalPassword = forcedPassword || freeDiscountPassword;

    if (freeDiscountValue > 0 && !finalPassword) {
      toast.error(t("FreeDiscountPasswordMissing"));
      isSubmitting.current = false;
      setLoading(false);
      return;
    }

    const safeOrderItems = Array.isArray(orderItems) ? orderItems : [];
    const itemsForPayload = safeOrderItems.map((item) => ({
      ...item,
      count: (item.weight_status === 1 || item.weight_status === "1")
        ? (item.quantity || item.count)
        : item.count,
    }));

    const hasDealItems = safeOrderItems.some((item) => item.is_deal);
    const endpoint = getOrderEndpoint(orderType, safeOrderItems, totalDineInItems, hasDealItems);
    const moduleId = localStorage.getItem("last_selected_group");

    // 🟢 لو Talabat بتدفع المبلغ كله (due_module = كامل المبلغ) → financials فاضية
    const isFullDueModule = dueModuleValue > 0 && Math.abs(dueModuleValue - discountedAmount) < 0.01;
    const financialsPayload = isFullDueModule ? [] : buildFinancialsPayload(paymentSplits, financialAccounts);

    let payload;
    if (hasDealItems) {
      payload = buildDealPayload(safeOrderItems, financialsPayload);
    } else {
      const finalDiscountIdToSend = selectedDiscountAmount > 0 ? finalSelectedDiscountId : selectedDiscountId;
      payload = buildOrderPayload({
        orderType,
        orderItems: itemsForPayload,
        amountToPay: discountedAmount.toFixed(2),
        totalTax,
        totalDiscount: totalAppliedDiscount,
        notes: notes.trim() || "",
        source,
        financialsPayload,
        cashierId,
        tableId,
        customerPaid: customerPaid || undefined,
        discountCode: appliedDiscount > 0 ? discountCode : undefined,
        due: due,
        user_id: customer_id,
        discount_id: selectedDiscountId,
        module_id: moduleId,
        free_discount: freeDiscountValue > 0 ? freeDiscountValue : undefined,
        due_module: dueModuleValue > 0 ? dueModuleValue.toFixed(2) : undefined,
        service_fees,
        password: finalPassword || undefined,
        repeated,

      });
    }

    try {
      const response = await postData(endpoint, payload);

      console.log("📥 Backend Response (Success Path):", response);

      if (response?.success) {
        // 🟢 نجاح العملية (زي ما هو)
        toast.success(due === 1 ? t("DueOrderCreated") : t("OrderPlaced"));

        if (due === 0) {
          const receiptData = prepareReceiptData(
            itemsForPayload,
            discountedAmount || amountToPay,
            totalTax,
            finalTotalDiscount || totalDiscount,
            appliedDiscount,
            discountData,
            orderType,
            requiredTotal,
            response.success,
            response
          );
          printReceiptSilently(receiptData, response, () => {
            handleNavigation(response);
            onClose?.();
          });
        } else {
          handleNavigation(response);
          onClose?.();
        }
      }
      // مفيش else هنا دلوقتي – كل الـ non-success بيروح للـ catch
    } catch (error) {
      console.log("🚨 Caught Error (likely 400):", error);

      let backendResponse = null;

      if (error.response && error.response.data) {
        backendResponse = error.response.data;
      } else if (error.response) {
        backendResponse = error.response; // لو الـ data مش موجود
      }

      console.log("📥 Backend Response from Catch:", backendResponse);

      if (backendResponse) {
        const errorMessage = backendResponse.errors || backendResponse.message || backendResponse.error || "";
        const trimmedError = typeof errorMessage === "string" ? errorMessage.trim() : "";
        const lowerError = trimmedError.toLowerCase();

        console.log("🔍 Error Message (raw):", errorMessage);
        console.log("🔍 Error Message (trimmed & lower):", lowerError);

        if (
          trimmedError === "order is repeated" ||
          trimmedError === "Order is repeated" ||
          lowerError === "order is repeated" ||
          lowerError.includes("order is repeated") ||
          lowerError.includes("repeated") ||
          lowerError.includes("مكرر")
        ) {
          console.log("✅ Repeated Order Detected – Opening Modal Now!");

          // نخزن كل البيانات هنا مباشرة (كل الـ variables متاحة)
          setPendingRepeatedPayload({
            endpoint,
            payload,
            itemsForPayload,
            discountedAmount: discountedAmount || amountToPay,
            totalTax,
            finalTotalDiscount: finalTotalDiscount || totalDiscount,
            appliedDiscount,
            discountData,
            orderType,
            requiredTotal,
            due,
            customer_id,
            dueModuleValue,
            forcedPassword: forcedPassword || pendingFreeDiscountPassword,
          });

          setShowRepeatModal(true);
          setLoading(false);
          isSubmitting.current = false;
          return; // مهم – ميعملش toast
        }
      }

      // أي خطأ (مش repeated أو no response) → toast عادي
      toast.error(t("SubmissionFailed"));
    } finally {
      if (!showRepeatModal) {
        setLoading(false);
        isSubmitting.current = false;
      }
    }
  };

  const handleSelectCustomer = async (customer) => {
    if (requiredTotal > customer.can_debit) {
      toast.error(
        t("OrderExceedsDebitLimit", { amount: requiredTotal.toFixed(2) })
      );
      return;
    }

    setSelectedCustomer(customer);
    setCustomerSelectionOpen(false);

    await proceedWithOrderSubmission(1, customer.id);
  };

  const handleSubmitOrder = async () => {
    // 🟢 أول سطر: لو القفل مقفول اخرج فوراً
    if (isSubmitting.current) return;

    if (!isTotalMet || (requiredTotal > 0 && totalScheduled === 0)) {
      return toast.error(t("TotalMustEqual", { amount: requiredTotal.toFixed(2) }));
    }

    const validation = validatePaymentSplits(paymentSplits, getDescriptionStatus);
    if (!validation.valid) {
      return toast.error(validation.error);
    }

    if (isDueOrder) {
      if (!selectedCustomer) {
        setCustomerSelectionOpen(true);
        refetchDueUsers();
        return;
      }
      // إذا كان due order ومختار عميل، كمل العملية
      await proceedWithOrderSubmission(1, selectedCustomer.id);
      return;
    }

    // 🟢 قبل ما تبدأ العملية، اقفل القفل
    isSubmitting.current = true;
    await proceedWithOrderSubmission(0);
  };

  const handleAssignDelivery = async () => {
    if (!orderId) return toast.error(t("OrderIdMissing"));
    if (!selectedDeliveryId) return toast.error(t("SelectDeliveryPerson"));

    try {
      await postData(`cashier/determine_delivery/${orderId}`, {
        delivery_id: selectedDeliveryId,
      });
      toast.success(t("DeliveryPersonAssigned"));
      setDeliveryModelOpen(false);
      resetCheckoutState(); // أضف التصفير هنا

    } catch (e) {
      toast.error(e.message || t("FailedToAssignDeliveryPerson"));
    }
  };

  const handleSkip = () => {
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_user_data");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("selected_address_data");
    setDeliveryModelOpen(false);
    resetCheckoutState(); // أضف التصفير هنا

  };

  return (
    <div className="w-full bg-white animate-in fade-in slide-in-from-top-4 duration-500">
      {/* 1. Modals - (كاملة كما هي بكل اللوجيك) */}
      <CustomerSelectionModal
        isOpen={customerSelectionOpen}
        onClose={() => {
          setCustomerSelectionOpen(false);
          if (!selectedCustomer) setIsDueOrder(false);
        }}
        onSelectCustomer={(customer) => {
          handleSelectCustomer(customer);
          setCustomerSelectionOpen(false);
        }}
        searchQuery={customerSearchQuery}
        setSearchQuery={setCustomerSearchQuery}
        customers={searchResults}
        loading={customerSearchLoading}
        requiredTotal={requiredTotal}
      />

      <DeliveryAssignmentModal
        isOpen={deliveryModelOpen}
        onClose={handleSkip}
        deliveryList={deliveryData?.deliveries}
        selectedDeliveryId={selectedDeliveryId}
        setSelectedDeliveryId={setSelectedDeliveryId}
        onAssign={handleAssignDelivery}
        onSkip={handleSkip}
      />

      {/* 🟢 Checkout Methods (يظهر عند الضغط على زر Checkout أو Pay) */}
      {requiredTotal > 0 && (
        <div className="border border-gray-300 rounded-lg overflow-hidden animate-in slide-in-from-top-2 duration-300">

          <div className="grid grid-cols-3 gap-2 p-2">
            {financialAccounts.map((acc, index) => {
              const isSelected = paymentSplits.length === 1 &&
                String(paymentSplits[0]?.accountId) === String(acc.id) &&
                !isDueOrder;

              return (
                <button
                  key={acc.id}
                  onClick={() => {
                    handleAccountChange(paymentSplits[0]?.id, String(acc.id));
                    setIsDueOrder(false);
                    setSelectedCustomer(null);
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 h-24",
                    isSelected
                      ? "border-red-600 bg-red-50 text-red-700 shadow-md scale-105"
                      : "border-red-200 bg-white text-gray-700 hover:border-gray-200 hover:bg-gray-50"
                  )}
                >
                  <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
                    {acc.logo_link ? (
                      <img src={acc.logo_link} alt={acc.name} className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full bg-gray-100 rounded-full flex items-center justify-center text-[10px] text-gray-400">
                        {acc.name?.charAt(0)}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-center leading-tight">
                    {acc.name}
                  </span>
                </button>
              );
            })}

            {/* Due Module as Visa - Platform pays */}
            {isDueModuleAllowed && (
              <button
                disabled={loading}
                onClick={() => proceedWithOrderSubmission(0, undefined, discountedAmount)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-red-200 bg-white text-[#1A1F71] hover:border-blue-200 hover:bg-blue-50 transition-all gap-2 h-24"
              >
                <div className="w-10 h-10 flex items-center justify-center">
                  <span className="text-2xl font-black italic tracking-tighter">VISA</span>
                </div>
                <span className="text-[10px] font-bold text-center uppercase">
                  Visa ({groupProducts.find(g => g.id === parseInt(lastSelectedGroup))?.name || "Talabat"})
                </span>
              </button>
            )}

            {/* Due - لون أورانج ثابت */}
            <button
              onClick={() => {
                setIsDueOrder(true);
                setCustomerSelectionOpen(true);
              }}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all gap-2 h-24",
                isDueOrder
                  ? "border-orange-500 bg-orange-500 text-white shadow-md scale-105"
                  : "border-red-200 bg-white text-orange-600 hover:border-orange-200 hover:bg-orange-50"
              )}
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-center">
                {t("Due")}
              </span>
            </button>

            {/* Split - لون أزرق ثابت */}
            <button
              onClick={handleAddSplit}
              className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-red-200 bg-white text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition-all gap-2 h-24"
            >
              <div className="w-10 h-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <span className="text-[10px] font-bold text-center">
                {t("Split")}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* Amount Paid by Customer */}
      <div className="mb-4">
        <label className="text-xs font-bold text-gray-500 mb-1 block">
          {t("AmountbyCustomer")}
        </label>
        <div className="relative">
          <Input
            type="number"
            value={customerPaid}
            onChange={(e) => setCustomerPaid(e.target.value)}
            className="pl-12 py-6 text-xl font-bold"
            placeholder="0.00"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
            EGP
          </span>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-gray-100 p-4 rounded-xl">
        <p className="text-4xl text-center m-auto font-black text-red-700">
          {requiredTotal.toFixed(2)} {getCurrencySymbol()}
        </p>

        {parseFloat(customerPaid) > requiredTotal && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 text-green-600 font-bold">
            <span>{t("Change")}</span>
            <span>
              {(parseFloat(customerPaid) - requiredTotal).toFixed(2)} {getCurrencySymbol()}
            </span>
          </div>
        )}
      </div>

      {/* 3. منطق عرض الـ Splits */}
      {(paymentSplits.length > 1 || isDueModuleAllowed || getDescriptionStatus(paymentSplits[0]?.accountId)) && (
        <div className="space-y-3 animate-in fade-in duration-300">
          <label className="text-xs font-bold text-gray-500 mb-1 block">
            {t("Payment Details")}
          </label>

          {paymentSplits.map((split, index) => (
            <div
              key={split.id}
              className="p-3 bg-gray-50 border rounded-lg space-y-3 shadow-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400">#{index + 1}</span>

                <div className="flex-1">
                  <Select
                    value={String(split.accountId)}
                    onValueChange={(val) => handleAccountChange(split.id, val)}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder={t("Select Account")} />
                    </SelectTrigger>
                    <SelectContent>
                      {financialAccounts.map((acc) => (
                        <SelectItem key={acc.id} value={String(acc.id)}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* المبلغ يظهر فقط في حالة الـ Split أو الـ Due لتقسيم المبالغ */}
                {(paymentSplits.length > 1 || isDueModuleAllowed) && (
                  <div className="w-1/3 relative">
                    <Input
                      type="number"
                      value={split.amount === 0 ? "" : split.amount}
                      onChange={(e) => handleAmountChange(split.id, e.target.value)}
                      className="bg-white pl-8 font-bold"
                    />
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">
                      EGP
                    </span>
                  </div>
                )}

                {paymentSplits.length > 1 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleRemoveSplit(split.id)}
                  >
                    ×
                  </Button>
                )}
              </div>

              {/* 🔵 يظهر دائماً للفيزا أو أي حساب له getDescriptionStatus = true */}
              {getDescriptionStatus(split.accountId) && (
                <div className="flex gap-2 pl-6 animate-in slide-in-from-top-1 duration-200">
                  <div className="w-1/4">
                    <Input
                      placeholder="4 digits"
                      value={split.checkout || ""}
                      onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                      maxLength={4}
                      className="bg-white text-center"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder={t("Transaction ID / Auth Code")}
                      value={split.transition_id || ""}
                      onChange={(e) => handleTransitionIdChange(split.id, e.target.value)}
                      className="bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* الزر النهائي - Pay Button */}
      <Button
        className={`w-full py-8 rounded-xl text-xl font-black uppercase tracking-widest transition-all ${loading ? 'bg-gray-300' : 'bg-[#800000] hover:bg-[#a00000] text-white shadow-xl active:scale-95'
          }`}
        disabled={loading}
        onClick={() => { handleSubmitOrder(); }}
      >
        {loading ? (
          <Loading />
        ) : (
          t("PayNow")
        )}
      </Button>

      {/* Repeat Order Modal */}
      {showRepeatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-center mb-4">
              {t("OrderRepeated") || "الطلب مكرر"}
            </h3>
            <p className="text-center text-gray-600 mb-8">
              {t("DoYouWantToRepeatOrder") || "هل تريد تكرار نفس الطلب مرة أخرى؟"}
            </p>
            <div className="flex gap-3">
              <button
                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-50"
                onClick={() => {
                  setShowRepeatModal(false);
                  setPendingRepeatedPayload(null);
                  isSubmitting.current = false;
                  setLoading(false);
                }}
              >
                {t("Cancel") || "إلغاء"}
              </button>
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={async () => {
                  setShowRepeatModal(false);
                  const data = pendingRepeatedPayload;
                  if (!data) return;
                  setLoading(true);
                  isSubmitting.current = true;
                  try {
                    const response = await postData(data.endpoint, {
                      ...data.payload,
                      repeated: "1",
                    });
                    if (response?.success) {
                      toast.success(t("OrderPlaced"));
                      const receiptData = prepareReceiptData(
                        data.itemsForPayload,
                        data.discountedAmount,
                        data.totalTax,
                        data.finalTotalDiscount,
                        data.appliedDiscount,
                        data.discountData,
                        data.orderType,
                        data.requiredTotal,
                        response.success,
                        response
                      );
                      if (data.due === 0) {
                        printReceiptSilently(receiptData, response, () => {
                          handleNavigation(response);
                        });
                      } else {
                        handleNavigation(response);
                      }
                      onClearCart?.();
                      onClose?.();
                    } else {
                      toast.error(response?.errors || t("FailedToProcessOrder"));
                    }
                  } catch (e) {
                    toast.error(e.message || t("SubmissionFailed"));
                  } finally {
                    setLoading(false);
                    isSubmitting.current = false;
                    setPendingRepeatedPayload(null);
                  }
                }}
              >
                {t("ConfirmRepeat") || "تأكيد التكرار"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default CheckOut;