// src/components/PasswordConfirmModal.jsx
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";

export default function PasswordConfirmModal({ onConfirm, onCancel, loading }) {
  const [password, setPassword] = useState("");
  const [isVisible, setIsVisible] = useState(true); // State داخلي للتحكم في الظهور
  const { t } = useTranslation();

  // لو الـ State بقى false المودال مش هيعرض حاجة (هيقفل)
  if (!isVisible) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(password);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[99999] p-4">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-sm w-[95vw] sm:w-full relative">

        {/* زرار الـ X - وظيفته بس يخلي isVisible بـ false */}
        <button
          onClick={() => setIsVisible(false)}
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={24} />
        </button>

        <h3 className="text-xl font-bold mb-4 text-center">
          {t("ConfirmShiftClosure")}
        </h3>

        <p className="text-gray-600 text-center mb-6">
          {t("EnterPasswordToCloseShift")}
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-xl tracking-widest"
            placeholder="•••"
            autoFocus
            required
            disabled={loading}
          />

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onCancel} // ده اللي جاي من الـ props زي ما هو للزرار التاني
              disabled={loading}
              className="flex-1 py-3 bg-gray-300 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              {t("Cancel")}
            </button>
            <button
              type="submit"
              disabled={loading || !password}
              className="flex-1 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50 transition"
            >
              {loading ? "..." : t("Confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}