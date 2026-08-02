import { getCurrencySymbol } from '../../utils/currency';
import React from "react";
import { useTranslation } from "react-i18next";

const SummaryRow = ({ label, value, valueClassName }) => {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const safeValue = Number(value || 0);
  return (
    <div
      className={`grid grid-cols-2 gap-10 py-2 ${
        isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
      }`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <p>{label}</p>
      <p className={valueClassName || ""}>
        {safeValue.toFixed(2)} {isArabic ? "ج.م" : getCurrencySymbol()}
      </p>
    </div>
  );
};

export default SummaryRow;
