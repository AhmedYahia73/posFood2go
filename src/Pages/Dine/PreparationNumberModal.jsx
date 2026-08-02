import React, { useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PreparationNumberModal = ({
  isOpen,
  onClose,
  onSubmit,
  loading,
  tableName,
}) => {
  const [preparationNum, setPreparationNum] = useState("");
  const { t } = useTranslation();

const handleSubmit = async () => {
  if (!preparationNum.trim()) {
    toast.error(t("PleaseEnterPreparationNumber"));
    return;
  }

  const res = await onSubmit(preparationNum); // استني نتيجة API

  if (res?.preparation_num) {
    localStorage.setItem("preparation_num", res.preparation_num);
  }
};

  const handleCancel = () => {
    setPreparationNum("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {t("EnterPreparationNumber")}
            </h2>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            {t("Table")}: <span className="font-semibold">{tableName}</span>
          </p>
        </div>

        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t("PreparationNumber")}
          </label>
          <Input
            type="text"
            placeholder={t("EnterNumber")}
            value={preparationNum}
            onChange={(e) => setPreparationNum(e.target.value)}
            disabled={loading}
            className="w-full text-lg py-3 px-4 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
          />

          <p className="text-xs text-gray-500 mt-2">
            {t("PreparationNumberHint")}
          </p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            onClick={handleCancel}
            disabled={loading}
            variant="outline"
            className="flex-1 py-3 text-base font-semibold border-2 hover:bg-gray-100"
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !preparationNum.trim()}
            className="flex-1 py-3 text-base font-semibold bg-blue-600 hover:bg-blue-700 text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                {t("Processing")}
              </span>
            ) : (
              t("Confirm")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PreparationNumberModal;
