import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";
import { FaShoppingCart, FaTrash, FaSave } from "react-icons/fa";

export default function CartSwitchConfirmModal({
  open,
  onOpenChange,
  onClearAndSwitch,
  onKeepAndSwitch,
  itemCount,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-6 rounded-2xl shadow-2xl border-0 overflow-hidden animate-in fade-in zoom-in duration-300">
        <DialogHeader className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <DialogTitle className="text-2xl font-extrabold text-gray-800 flex items-center gap-2">
               {t("Cart Has Items")} <FaShoppingCart className="text-orange-500" />
            </DialogTitle>
          </div>
          <p className="text-gray-500 font-medium text-lg text-left" dir={isArabic ? "rtl" : "ltr"}>
            {t("You have")} {itemCount} {t("item(s) in your cart. What would you like to do?")}
          </p>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <div className="flex gap-3">
             <button
              onClick={onClearAndSwitch}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <FaTrash />
              <span>{t("Clear & Switch")}</span>
            </button>

            <button
              onClick={onKeepAndSwitch}
              className="flex-1 bg-white border-2 border-blue-400 text-blue-600 hover:bg-blue-50 font-bold py-4 px-4 rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <FaSave />
              <span>{t("Keep for Later")}</span>
            </button>
          </div>

          <button
            onClick={() => onOpenChange(false)}
            className="w-full bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold py-3 px-4 rounded-xl transition-all"
          >
            {t("Cancel")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
