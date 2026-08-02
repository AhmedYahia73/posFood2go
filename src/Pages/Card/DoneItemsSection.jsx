import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const DoneItemsSection = ({
  doneItems,
  selectedPaymentItems,
  handleSelectAllPaymentItems,
}) => {
  const { t } = useTranslation();

  return (
    <div className="mt-6 bg-green-50 p-4 rounded-lg sm:overflow-y-auto md:overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden max-h-40">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-semibold text-green-800">
          {t("ReadyForPayment", { count: doneItems.length })} ({doneItems.length} {t("items")})
        </h3>
        <Button
          onClick={handleSelectAllPaymentItems}
          variant="outline"
          size="sm"
          className="text-green-600 border-green-300 hover:bg-green-100"
        >
          {selectedPaymentItems.length === doneItems.length
            ? t("DeselectAll")
            : t("SelectAll")}
        </Button>
      </div>
      <p className="text-sm text-green-700 mb-3">
        {t("SelectItemsForPayment", { count: selectedPaymentItems.length })}
      </p>
    </div>
  );
};

export default DoneItemsSection;
