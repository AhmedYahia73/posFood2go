// ============================================
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import { usePost } from "@/Hooks/usePost";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Components
import Loading from "@/components/Loading";
import CheckOut from "../Checkout/CheckOut";
import CardHeader from "./CardHeader";
import BulkActionsBar from "./BulkActionsBar";
import OrderTable from "./OrderTable";
import DoneItemsSection from "./DoneItemsSection";
import OrderSummary from "./OrderSummary";
import OfferModal from "./OfferModal";
import DealModal from "./DealModal";
import VoidItemModal from "./VoidItemModal";
import ClearAllConfirmModal from "./ClearAllConfirmModal";
import ClearAllManagerModal from "./ClearAllManagerModal";

// Hooks & Utils
import { useOrderCalculations } from "./Hooks/useOrderCalculations";
import { useOrderActions } from "./Hooks/useOrderActions";
import { useOfferManagement } from "./Hooks/useOfferManagement";
import { useDealManagement } from "./Hooks/useDealManagement";
import { OTHER_CHARGE } from "./constants";
import { useServiceFee } from "./Hooks/useServiceFee";
import DineInformation from "./DineInformation";
import { useGet } from "@/Hooks/useGet";
export default function Card({
  orderItems,
  updateOrderItems,
  allowQuantityEdit = true,
  orderType,
  tableId,
  onClose,
}) {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { loading: apiLoading, postData } = usePost();
  const selectedUserData = JSON.parse(localStorage.getItem("selected_user_data") || "{}");
  const [isCheckoutVisible, setIsCheckoutVisible] = useState(false);
  const [selectedDiscountId, setSelectedDiscountId] = useState(null);
  const [freeDiscount, setFreeDiscount] = useState("");
  const [freeDiscountPassword, setFreeDiscountPassword] = useState("");
  const deliveryFee = orderType === "delivery"
    ? Number(selectedUserData?.selectedAddress?.zone?.price || 0)
    : 0;
  // State Management
  const [selectedItems, setSelectedItems] = useState([]);
  const [selectedPaymentItems, setSelectedPaymentItems] = useState([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [itemLoadingStates, setItemLoadingStates] = useState({});
  const { data: captainsData, isLoading: loadingCaptains } = useGet("cashier/captain_orders");
  // Void Modal States
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidItemId, setVoidItemId] = useState(null);
  const [managerId, setManagerId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [notes, setNotes] = useState("");
  // Clear All Modals
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [showClearAllManagerModal, setShowClearAllManagerModal] =
    useState(false);
  const [clearAllManagerId, setClearAllManagerId] = useState("");
  const [clearAllManagerPassword, setClearAllManagerPassword] = useState("");
  const [showSavePendingModal, setShowSavePendingModal] = useState(false); // New state for Pending Modal

  const { data: serviceFeeData } =
    useServiceFee(orderType);
  // Custom Hooks
  const calculations = useOrderCalculations(
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData,
    deliveryFee
  );
  const offerManagement = useOfferManagement(
    orderItems,
    updateOrderItems,
    postData,
    t
  );
  const dealManagement = useDealManagement(orderItems, updateOrderItems, t);
  const orderActions = useOrderActions({
    orderItems,
    notes,
    setNotes,
    updateOrderItems,
    tableId,
    orderType,
    postData,
    navigate,
    t,
    itemLoadingStates,
    setItemLoadingStates,
  });
  const allItemsDone =
    orderType === "dine_in" &&
    orderItems.length > 0 &&
    calculations.doneItems.length === orderItems.length;
  const printRef = useRef();
  // Add temp_id to items if missing
  useEffect(() => {
    // 1. توليد temp_id للعناصر التي لا تملك واحداً
    const needsUpdate = orderItems.some((item) => !item.temp_id);
    if (needsUpdate) {
      const updatedItemsWithTempId = orderItems.map((item) => ({
        ...item,
        temp_id:
          item.temp_id ||
          `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      }));
      updateOrderItems(updatedItemsWithTempId);
    }

    // 2. جعل العناصر مختارة افتراضياً (Selected by default)
    if (orderItems.length > 0) {
      const allIds = orderItems
        .filter(item => item.temp_id) // نختار فقط العناصر التي تملك temp_id
        .map((item) => item.temp_id);

      if (selectedItems.length !== allIds.length) {
        setSelectedItems(allIds);
      }
    }
  }, [orderItems]); // يعتمد على تغير قائمة العناصر

  const clearCart = () => {
    updateOrderItems([]); // تصفير مصفوفة المنتجات
    localStorage.removeItem("cart");
    localStorage.removeItem(`cart_${orderType}`);
    setSelectedItems([]);
    setSelectedPaymentItems([]);

    // إذا كان هناك states أخرى للمبالغ في المكون الأب يتم تصفيرها هنا
    toast.success(t("Allitemsclearedfromtheorder"));
  };
  // Clear cart function
  const clearPaidItemsOnly = () => {
    // نحذف بس العناصر اللي تم اختيارها للدفع (selectedPaymentItems)
    const paidItemIds = new Set(selectedPaymentItems);

    const remainingItems = orderItems.filter(
      (item) => !paidItemIds.has(item.temp_id)
    );
    if (orderType === "delivery") {
      onClose(); // العودة لتبويب الديليفري الرئيسي بعد الدفع
    }
    // نعمل تحديث للسلة بالعناصر الباقية فقط
    updateOrderItems(remainingItems);

    // نحدث localStorage بالباقي
    if (remainingItems.length > 0) {
      localStorage.setItem("cart", JSON.stringify(remainingItems));
      localStorage.setItem(`cart_${orderType}`, JSON.stringify(remainingItems));
    } else {
      localStorage.removeItem("cart");
      localStorage.removeItem(`cart_${orderType}`);
    }

    // نرست التحديدات
    setSelectedItems([]);
    setSelectedPaymentItems([]);

    toast.success(
      remainingItems.length > 0
        ? t("PaiditemshavebeenremovedRemainingitemsstillintheorder")
        : t("Allselecteditemshavebeenpaidandremoved")
    );
  };

  // Handlers

  const handleClearAllItems = () => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstoclear"));
      return;
    }
    setNotes("");
    // التحقق: هل يوجد أي عنصر بدأ التحضير فعلياً؟
    const needsManager = orderItems.some(item =>
      ["preparing", "pick_up", "done"].includes(item.preparation_status || "pending")
    );

    if (orderType === "dine_in" && needsManager) {
      // حالة تتطلب مدير (وجود عناصر قيد التحضير)
      setShowClearAllManagerModal(true);
    } else if (orderItems.some(item => item.cart_id)) {
      // حالة لا تتطلب مدير ولكن العناصر موجودة على السيرفر (كلها Waiting/Pending)
      // سنقوم باستدعاء دالة المسح مباشرة ببيانات فارغة للمدير
      confirmClearAllWithManager("", "");
    } else {
      // عناصر محليّة فقط (Front-end) لم تُرسل للسيرفر بعد
      setShowClearAllConfirm(true);
    }
  };

  const confirmClearAllWithManager = async (manualId, manualPassword) => {
    // تحديد الهوية المستخدمة (سواء من الـ State أو من البارامترات المرسلة يدوياً)
    const mId = manualId !== undefined ? manualId : clearAllManagerId;
    const mPw = manualPassword !== undefined ? manualPassword : clearAllManagerPassword;

    // الحصول على جميع معرفات السلة
    const allValidCartIds = orderItems
      .flatMap((item) => {
        if (Array.isArray(item.cart_id)) return item.cart_id;
        if (typeof item.cart_id === "string")
          return item.cart_id.split(",").map((id) => id.trim());
        if (item.cart_id) return [item.cart_id.toString()];
        return [];
      })
      .filter(Boolean);

    if (allValidCartIds.length === 0) {
      toast.error(t("Noitemswithcartidtovoid"));
      return;
    }

    const formData = new FormData();
    allValidCartIds.forEach((id) => formData.append("cart_ids[]", id));
    formData.append("table_id", tableId.toString());

    // 🟢 إضافة بيانات المدير فقط إذا تم توفيرها
    if (mId) formData.append("manager_id", mId);
    if (mPw) formData.append("manager_password", mPw);

    try {
      setItemLoadingStates((prev) => ({ ...prev, clearAll: true }));
      await postData("cashier/order_void", formData);

      updateOrderItems([]); // مسح البيانات محلياً
      localStorage.removeItem("cart");
      toast.success(t("Allitemsvoidedsuccessfully"));

      setShowClearAllManagerModal(false);
      setClearAllManagerId("");
      setClearAllManagerPassword("");

      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (err) {
      let errorMessage = t("Failedtovoidallitems");
      if (err.response?.status === 401 || err.response?.status === 403) {
        errorMessage = t("InvalidManagerIDorPasswordAccessdenied");
      }
      toast.error(errorMessage);
    } finally {
      setItemLoadingStates((prev) => ({ ...prev, clearAll: false }));
    }
  };
  const handlePrint = () => {
    if (!printRef.current) return;

    const printContents = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=800,height=600");
    printWindow.document.write(`
    <html>
      <head>
        <title>Print Order</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; }
          th { background-color: #f0f0f0; }
        </style>
      </head>
      <body>${printContents}</body>
    </html>
  `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleTransferToDineIn = () => {
    if (orderItems.length === 0) {
      toast.warning(t("Noitemstotransfer"));
      return;
    }

    // Calculate total discount from items
    const totalItemDiscount = orderItems.reduce((sum, item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? (item.quantity || item.count || 1)
        : (item.count || 1);
      return sum + (Number(item.discount_val || 0) * qty);
    }, 0);

    // Save current takeaway items to localStorage for the transfer
    localStorage.setItem("transfer_takeaway_order", JSON.stringify({
      orderItems,
      amount: calculations.amountToPay,
      totalTax: calculations.totalTax,
      totalDiscount: totalItemDiscount.toFixed(2),
      notes: notes,
    }));
    localStorage.setItem("transfer_takeaway_to_dine_in", "true");

    navigate("/tables");
  };


  return (
    <div
      ref={printRef}
      className={`flex flex-col h-full 
    /* خلفية بيضاء نقية مع ملمس ناعم */
    bg-white 
    /* ظل "عائم" احترافي يعطي عمقاً حقيقياً للكارت */
    shadow-xl
    /* حواف دائرية انسيابية جداً (Super Ellipse) */
    rounded-[1rem] 
    /* حدود خفيفة جداً تكاد لا تُرى لتحديد الأبعاد */
    border border-red-200 border-[2px]
    /* لضمان عدم خروج المحتوى عن انسيابية الزوايا */
    overflow-hidden 
    p-4
    /* موازنة المسافات */
    relative
    ${isArabic ? "text-right" : "text-left"}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <DineInformation onClose={onClose} />
      {/* Header Section */}
      <CardHeader
        onSaveAsPending={() => setShowSavePendingModal(true)}
        orderType={orderType}
        orderItems={orderItems}
        handleClearAllItems={handleClearAllItems}
        handleViewOrders={() => {

          navigate("/orders", {
            state: {
              orderType: orderType  // أو currentOrderType أو propOrderType حسب المتغير عندك
            }
          });
        }}
        handleViewPendingOrders={() => navigate("/pending-orders")}
        onShowOfferModal={() => offerManagement.setShowOfferModal(true)}
        onShowDealModal={() => dealManagement.setShowDealModal(true)}
        onTransferToDineIn={handleTransferToDineIn}
        isLoading={apiLoading}
        t={t}
      />

      {/* Bulk Actions Bar (Dine-in only) */}
      {orderType === "dine_in" && (
        <BulkActionsBar
          bulkStatus={bulkStatus}
          setBulkStatus={setBulkStatus}
          orderItems={orderItems}
          selectedItems={selectedItems}

          onApplyStatus={async (statusOverride) => {
            const finalStatus = typeof statusOverride === 'string' ? statusOverride : bulkStatus;

            // يجب إضافة return و await هنا لضمان وصول البيانات للـ BulkActionsBar
            return await orderActions.applyBulkStatus(
              selectedItems,
              finalStatus,
              setBulkStatus,
              setSelectedItems
            );
          }}
          onTransferOrder={(selected) => orderActions.handleTransferOrder(selected)}
          isLoading={apiLoading}
          currentLowestStatus={calculations.currentLowestSelectedStatus}
          t={t}
          captainsData={captainsData}
          loadingCaptains={loadingCaptains}
        />
      )}

      {/* Order Table */}
      <div className=" overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {apiLoading && (
          <div className="flex justify-center items-center h-40">
            <Loading />
          </div>
        )}

        <OrderTable
          orderItems={orderItems}
          handleClearAllItems={handleClearAllItems}
          orderType={orderType}
          tableId={tableId}
          selectedItems={selectedItems}
          selectedPaymentItems={selectedPaymentItems}
          onToggleSelectItem={(id) =>
            setSelectedItems((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onToggleSelectPaymentItem={(id) =>
            setSelectedPaymentItems((prev) =>
              prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
            )
          }
          onSelectAll={() => {
            const allIds = orderItems.map((item) => item.temp_id);
            setSelectedItems((prev) =>
              prev.length === allIds.length ? [] : allIds
            );
          }}
          onIncrease={orderActions.handleIncrease}
          onDecrease={orderActions.handleDecrease}
          onUpdateStatus={orderActions.handleUpdatePreparationStatus}
          // داخل Card.jsx في دالة onVoidItem

          onVoidItem={(itemId) => {
            const item = orderItems.find(i => i.temp_id === itemId);
            const status = item?.preparation_status || "pending";
            const hasCartId = !!item?.cart_id;

            // 1. إذا كان المنتج "قيد التحضير" أو "تم" -> اطلب صلاحية مدير
            if (orderType === "dine_in" && ["preparing", "pick_up", "done"].includes(status)) {
              setVoidItemId(itemId);
              setShowVoidModal(true);
            }
            // 2. إذا كان المنتج "Waiting/Pending" وموجود في السيرفر (له cart_id) -> احذف من الـ API مباشرة بدون كلمة سر
            else if (hasCartId) {
              orderActions.confirmVoidItem(itemId, null, null, () => {
                // نجح الحذف من السيرفر
              });
            }
            // 3. إذا كان المنتج لم يرسل للسيرفر أصلاً (Front-end only)
            else {
              orderActions.handleRemoveFrontOnly(itemId);
            }
          }}
          onRemoveFrontOnly={orderActions.handleRemoveFrontOnly}
          allowQuantityEdit={allowQuantityEdit}
          itemLoadingStates={itemLoadingStates}
          updateOrderItems={updateOrderItems}
          t={t}
        />

        {/* Done Items Section (Dine-in only) */}
        {orderType === "dine_in" && calculations.doneItems.length > 0 && (
          <DoneItemsSection
            doneItems={calculations.doneItems}
            selectedPaymentItems={selectedPaymentItems}
            handleSelectAllPaymentItems={() => {
              const allDoneIds = calculations.doneItems.map(
                (item) => item.temp_id
              );
              setSelectedPaymentItems((prev) =>
                prev.length === allDoneIds.length ? [] : allDoneIds
              );
            }}
          />
        )}
      </div>

      {/* Order Summary */}
      <OrderSummary
        isCheckoutVisible={isCheckoutVisible}
        onCheckout={() => setIsCheckoutVisible(prev => !prev)}
        orderType={orderType}
        subTotal={calculations.subTotal}
        totalTax={calculations.totalTax}
        apiTotalDiscount={calculations.totalDiscount}
        totalOtherCharge={calculations.totalOtherCharge}
        serviceFeeData={serviceFeeData}
        taxDetails={calculations.taxDetails}
        totalAmountDisplay={calculations.totalAmountDisplay}
        amountToPay={calculations.amountToPay}
        selectedPaymentCount={selectedPaymentItems.length}
        // onCheckout={handleCheckOut}
        onSaveAsPending={() => orderActions.handleSaveAsPending(calculations.amountToPay, calculations.totalTax)}
        offerManagement={offerManagement}   // ده المهم
        isLoading={apiLoading}
        orderItemsLength={orderItems.length}
        allItemsDone={allItemsDone}
        t={t}
        notes={notes}
        setNotes={setNotes}
        onPrint={handlePrint}
        orderItems={orderItems}
        tableId={tableId}
        selectedDiscountId={selectedDiscountId}
        setSelectedDiscountId={setSelectedDiscountId}
        freeDiscount={freeDiscount}
        setFreeDiscount={setFreeDiscount}
        setFreeDiscountPassword={setFreeDiscountPassword}
      />

      {/* Modals */}
      <Dialog open={showSavePendingModal} onOpenChange={setShowSavePendingModal}>
        <DialogContent className="max-w-md bg-white p-6 rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-gray-800 mb-2">{t("SaveasPending")}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-6 mt-2">
            <p className="text-gray-600 text-lg">{t("IsThisOrderPrepared")}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setShowSavePendingModal(false);
                  // Case 2: Prepare & Pending - Kitchen prints now, Cashier+Order at checkout
                  localStorage.setItem("pending_order_info", JSON.stringify({ prepare: "1", pending: "1" }));
                  orderActions.handleSaveAsPending(calculations.amountToPay, calculations.totalTax, "1", "1");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 text-lg font-semibold shadow-md flex items-center justify-center gap-2 rounded-lg"
              >
                <span>✅</span> {t("Prepare & Pending")}
              </button>
              <button
                onClick={() => {
                  setShowSavePendingModal(false);
                  // Case 1: Pending Only - All 3 receipts print at checkout
                  localStorage.setItem("pending_order_info", JSON.stringify({ prepare: "0", pending: "1" }));
                  orderActions.handleSaveAsPending(calculations.amountToPay, calculations.totalTax, "0", "1");
                }}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 py-4 text-lg font-semibold border border-gray-300 shadow-sm rounded-lg"
              >
                {t("Pending Only")}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <VoidItemModal
        open={showVoidModal}
        onOpenChange={setShowVoidModal}
        managerId={managerId}
        setManagerId={setManagerId}
        managerPassword={managerPassword}
        setManagerPassword={setManagerPassword}
        confirmVoidItem={() =>
          orderActions.confirmVoidItem(
            voidItemId,
            managerId,
            managerPassword,
            () => {
              setShowVoidModal(false);
              setManagerId("");
              setManagerPassword("");
              setVoidItemId(null);
            }
          )
        }
        isLoading={apiLoading}
      />

      <ClearAllConfirmModal
        open={showClearAllConfirm}
        onOpenChange={setShowClearAllConfirm}
        onConfirm={() => {
          updateOrderItems([]);                    // نمسح الكل من السلة
          localStorage.removeItem("cart");       // نمسح من الـ session
          setSelectedItems([]);                    // نرست التحديد
          setSelectedPaymentItems([]);             // نرست تحديد الدفع
          toast.success(t("Allitemsclearedfromtheorder"));
          setShowClearAllConfirm(false);
        }}
        itemCount={orderItems.length}
        t={t}
      />

      <ClearAllManagerModal
        open={showClearAllManagerModal}
        onOpenChange={setShowClearAllManagerModal}
        managerId={clearAllManagerId}
        setManagerId={setClearAllManagerId}
        managerPassword={clearAllManagerPassword}
        setManagerPassword={setClearAllManagerPassword}
        onConfirm={() => confirmClearAllWithManager(clearAllManagerId, clearAllManagerPassword)}
        isLoading={itemLoadingStates.clearAll}
        t={t}
      />

      <OfferModal
        isOpen={offerManagement.showOfferModal}
        onClose={() => offerManagement.setShowOfferModal(false)}
        offerCode={offerManagement.offerCode}
        setOfferCode={offerManagement.setOfferCode}
        onApply={offerManagement.handleApplyOffer}
        pendingApproval={offerManagement.pendingOfferApproval}
        onApprove={offerManagement.handleApproveOffer}
        onCancelApproval={() => {
          offerManagement.setPendingOfferApproval(null);
          offerManagement.setOfferCode("");
        }}
        isLoading={apiLoading}
        t={t}
      />

      <DealModal
        isOpen={dealManagement.showDealModal}
        onClose={() => dealManagement.setShowDealModal(false)}
        dealCode={dealManagement.dealCode}
        setDealCode={dealManagement.setDealCode}
        onApply={dealManagement.handleApplyDeal}
        pendingApproval={dealManagement.pendingDealApproval}
        onApprove={dealManagement.handleApproveDeal}
        onCancelApproval={() => {
          dealManagement.setPendingDealApproval(null);
          dealManagement.setDealCode("");
        }}
        isLoading={apiLoading}
        t={t}
      />


      <Dialog open={isCheckoutVisible} onOpenChange={setIsCheckoutVisible}>
        <DialogContent className="w-[95vw] md:w-full max-w-5xl max-h-[90vh] sm:max-h-[85vh] overflow-y-auto bg-white p-0 rounded-2xl sm:rounded-lg">
          <DialogHeader className="pt-2 border-b">
            <DialogTitle className=" m-auto text-xl font-bold text-bg-primary">{t("Checkout")}</DialogTitle>
          </DialogHeader>
          <div className="p-4 pt-1">
            <CheckOut
              notes={notes}
              setNotes={setNotes}
              isCheckoutVisible={isCheckoutVisible}
              totalDineInItems={orderItems.length}
              amountToPay={calculations.amountToPay}
              orderItems={calculations.checkoutItems}
              updateOrderItems={updateOrderItems}
              totalTax={calculations.totalTax}
              totalDiscount={OTHER_CHARGE}
              source="web"
              orderType={orderType}
              tableId={tableId}
              onClearCart={clearCart}
              clearPaidItemsOnly={clearPaidItemsOnly}
              selectedPaymentItemIds={selectedPaymentItems}
              service_fees={calculations.totalOtherCharge}
              onClose={() => setIsCheckoutVisible(false)}
              onCheckout={() => setIsCheckoutVisible(prev => !prev)}
              selectedDiscountId={selectedDiscountId}
              freeDiscount={freeDiscount}
              freeDiscountPassword={freeDiscountPassword}
              setSelectedDiscountId={setSelectedDiscountId}
              setFreeDiscount={setFreeDiscount}
            />
          </div>
        </DialogContent>
      </Dialog>

      <ToastContainer />
      <div style={{ display: "none" }}>
        <div ref={printRef} className="print-area">
          <h2 style={{ textAlign: "center" }}>Order Summary</h2>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Product</th>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Price</th>
                <th style={{ border: "1px solid #000", padding: "8px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {orderItems.map((item) => (
                <tr key={item.temp_id}>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{item.name}</td>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{item.price.toFixed(2)}</td>
                  <td style={{ border: "1px solid #000", padding: "8px" }}>{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ marginTop: "10px", textAlign: "right" }}>
            <p>Tax: {calculations.totalTax.toFixed(2)}</p>
            <p>Service Fee: {calculations.totalOtherCharge.toFixed(2)}</p>
            <p><strong>Total: {calculations.amountToPay.toFixed(2)}</strong></p>
          </div>
        </div>
      </div>

    </div>
  );
}
