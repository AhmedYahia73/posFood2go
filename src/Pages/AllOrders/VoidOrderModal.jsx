import React, { useState, useEffect } from "react";
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
import { toast } from "react-toastify";
import { X, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { prepareReceiptData, printReceiptSilently } from "../utils/printReceipt";

export default function VoidOrderModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  onSuccess
}) {
  const [managerId, setManagerId] = useState("");
  const [managerPassword, setManagerPassword] = useState("");
  const [financialId, setFinancialId] = useState("");
  const [voidId, setVoidId] = useState("");
  const [voidReason, setVoidReason] = useState(""); // 🟢 هنا المستخدم يكتب السبب

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const { postData, loading } = usePost();

  // 🟢 استخدام useGet لجلب void lists
  const {
    data: voidListsData,
    isLoading: loadingVoidLists,
    refetch: fetchVoidLists
  } = useGet(null, { useCache: true });

  // 🟢 جلب الـ financial accounts من localStorage
  const financialAccounts = JSON.parse(localStorage.getItem("financial_account") || "[]");

  // 🟢 جلب الـ void lists عند فتح الـ Modal
  useEffect(() => {
    if (isOpen) {
      fetchVoidLists("cashier/orders/void_lists");
    }
  }, [isOpen, fetchVoidLists]);

  // 🟢 استخراج قائمة الـ void reasons بالشكل الصحيح
  const voidLists = voidListsData?.void_reasons || [];

  const handleVoidOrder = async () => {
    // Validation
    if (!orderId) {
      toast.error(t("OrderIDismissing"));
      return;
    }
    if (!managerId.trim()) {
      toast.error(t("PleaseenterManagerID"));
      return;
    }
    if (!managerPassword.trim()) {
      toast.error(t("PleaseenterManagerPassword"));
      return;
    }
    if (!financialId.trim()) {
      toast.error(t("PleaseselectFinancialAccount"));
      return;
    }
    if (!voidId.trim()) {
      toast.error(t("PleaseselectVoidReason") || "Please select void reason");
      return;
    }
    if (!voidReason.trim()) {
      toast.error(t("PleaseenterVoidReason") || "Please enter void reason details");
      return;
    }

    try {
      const payload = {
        order_id: orderId,
        financial_id: financialId,
        manager_id: managerId,
        manager_password: managerPassword,
        void_id: voidId,
        void_reason: voidReason, // 🟢 النص اللي المستخدم كتبه
      };

      console.log("Void Order Payload:", payload);

      const response = await postData("cashier/orders/void_order", payload);

      if (response?.success) {
        toast.success(t("Ordervoidedsuccessfully"));

        // 🖨️ طباعة ريسبونت ملغي بعد النجاح مباشرة
        try {
          const printResponse = {
            ...response,
            isCancelled: true,
            order_number: orderNumber,
            order_id: orderId
          };

          const receiptData = prepareReceiptData(
            response.products || [],
            response.amount || 0,
            response.total_tax || 0,
            response.total_discount || 0,
            0, null,
            response.order_type || "take_away",
            response.amount || 0,
            null,
            printResponse
          );

          await printReceiptSilently(receiptData, response, () => {
            console.log("Cancelled receipt printed successfully");
          });
        } catch (printErr) {
          console.error("Print Error after void:", printErr);
        }

        // Reset form
        setManagerId("");
        setManagerPassword("");
        setFinancialId("");
        setVoidId("");
        setVoidReason("");

        // Close modal
        onClose();

        // 🔥 تأخير بسيط قبل الـ refresh عشان الـ backend يحدث الداتا
        setTimeout(() => {
          if (onSuccess) onSuccess();
        }, 500);
      } else {
        toast.error(response?.data?.errors || t("Failedtovoidorder"));
      }
    } catch (err) {
      console.error("Void Order Error:", err);

      // حاول تجيب الرسالة من الـ backend
      let errorMessage = t("Anunexpectederroroccurred");

      if (err.response?.data) {
        const { data } = err.response;

        // لو في field اسمه errors أو message
        if (data.errors) {
          errorMessage = data.errors;
        } else if (data.message) {
          errorMessage = data.message;
        } else if (data.error) {
          errorMessage = data.error;
        }
      }

      toast.error(errorMessage);
    }

  };

  const handleClose = () => {
    setManagerId("");
    setManagerPassword("");
    setFinancialId("");
    setVoidId("");
    setVoidReason("");
    onClose();
  };

  // 🟢 عند اختيار void من الـ dropdown، نملأ الـ text input تلقائياً
  const handleVoidIdChange = (e) => {
    const selectedId = e.target.value;
    setVoidId(selectedId);

    // املأ الـ void_reason تلقائياً من الاختيار
    const selectedVoid = voidLists.find(v => v.id.toString() === selectedId);
    if (selectedVoid) {
      setVoidReason(selectedVoid.void_reason);
    } else {
      setVoidReason(""); // لو اختار "Select" يفضي الحقل
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        className="w-[90vw] !max-w-[500px] p-4 rounded-2xl shadow-2xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"

        dir={isArabic ? "rtl" : "ltr"}
      >
        {/* Close Button */}
        <DialogClose
          asChild
          onClick={handleClose}
          className={`absolute top-3 ${isArabic ? "left-3" : "right-3"} text-gray-500 hover:text-gray-700`}
        >
          <button aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </DialogClose>

        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="w-5 h-5" />
            {t("VoidOrder")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Order Info */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">
              {t("OrderNumber")}: <span className="font-semibold text-gray-800">#{orderNumber}</span>
            </p>
          </div>

          {/* 🟢 Void Type/Category - Select Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("VoidType") || "Void Type"} <span className="text-red-500">*</span>
            </label>
            <select
              value={voidId}
              onChange={handleVoidIdChange}
              disabled={loading || loadingVoidLists}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">
                {loadingVoidLists
                  ? t("Loading") || "Loading..."
                  : t("SelectVoidType") || "Select Void Type"
                }
              </option>
              {voidLists.map((voidItem) => (
                <option key={voidItem.id} value={voidItem.id}>
                  {voidItem.void_reason}
                </option>
              ))}
            </select>
          </div>

          {/* 🟢 Void Reason - Text Input (editable) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("VoidReasonDetails") || "Void Reason Details"} <span className="text-red-500">*</span>
            </label>
            <Input
              type="text"
              placeholder={t("EnterVoidReasonDetails") || "Enter additional details..."}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              disabled={loading}
              className="w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              {t("VoidReasonHint") || "You can edit or add more details"}
            </p>
          </div>

          {/* Financial ID - Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("FinancialAccount")} <span className="text-red-500">*</span>
            </label>
            <select
              value={financialId}
              onChange={(e) => setFinancialId(e.target.value)}
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              <option value="">{t("SelectFinancialAccount")}</option>
              {financialAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {account.details}
                </option>
              ))}
            </select>
          </div>

          {/* Manager ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("ManagerID")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder={t("EnterManagerID")}
              value={managerId}
              onChange={(e) => setManagerId(e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Manager Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t("ManagerPassword")} <span className="text-red-500">*</span>
            </label>
            <Input
              type="password"
              placeholder={t("EnterManagerPassword")}
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              disabled={loading}
              className="w-full"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              onClick={handleClose}
              disabled={loading}
              variant="outline"
              className="flex-1"
            >
              {t("Cancel")}
            </Button>
            <Button
              onClick={handleVoidOrder}
              disabled={loading}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <svg
                    className="animate-spin h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  <span>{t("Processing")}</span>
                </div>
              ) : (
                <span className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  {t("VoidOrder")}
                </span>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}