import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

export default function ModuleOrderModal({
  isOpen,
  onClose,
  moduleOrderNumber,
  setModuleOrderNumber,
  onSave,
}) {
  const { t } = useTranslation();

  const handleSave = () => {
    if (!moduleOrderNumber.trim()) {
      toast.error(t("PleaseEnterModuleOrderNumber") || "يرجى إدخال رقم الطلب");
      return;
    }
    onSave(); // هتنفذ اللي في Item.jsx
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md mx-4">
        <h2 className="text-2xl font-bold text-center mb-6">
          {t("EnterModuleOrderNumber") || "أدخل رقم طلب الموديول"}
        </h2>

        <input
          type="text"
          value={moduleOrderNumber}
          onChange={(e) => setModuleOrderNumber(e.target.value)}
          placeholder={t("ModuleOrderNumber") || "رقم الطلب"}
          className="w-full px-4 py-3 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-bg-primary focus:border-transparent outline-none"
          autoFocus
        />

        <div className="flex justify-end gap-4 mt-8">
          <Button
            onClick={onClose}
            variant="outline"
          >
            {t("Cancel") || "إلغاء"}
          </Button>

          <Button
            onClick={handleSave}
            className="bg-bg-primary text-white px-8"
          >
            {t("Save") || "حفظ"}
          </Button>
        </div>
      </div>
    </div>
  );
}