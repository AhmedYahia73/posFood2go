import React, { useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { Edit} from "lucide-react";
import EditExpenseModal from "../ExpensesModal";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";

export default function ExpensesList() {
  const { data, loading ,refetch } = useGet("cashier/expenses_list?locale=ar");
  const [selectedExpense, setSelectedExpense] = useState(null);
  const { t,i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  if (loading) return <Loading/>;

  return (
  <div className="p-4" dir={isArabic ? "rtl" : "ltr"}>
      <h1 className="text-xl font-bold mb-4">{t('Expenses')}</h1>

      <div className="space-y-3">
        {data?.expenses?.map((item) => (
          <div
            key={item.id}
            className="p-4 border rounded-lg flex justify-between items-center bg-white"
          >
            <div>
              <p className="font-bold">{item.expense}</p>
             <p>{t("price", { value: item.amount })}</p>
<p>{t("category", { name: item.category?.name })}</p>
<p>{t("note", { note: item.note || "-" })}</p>

            </div>

            <Edit
              className="cursor-pointer text-bg-primary hover:text-bg-primary/80"
              onClick={() => setSelectedExpense(item)}
            />
          </div>
        ))}
      </div>

      {/* Modal */}
      {selectedExpense && (
        <EditExpenseModal
          expense={selectedExpense}
          onClose={() => setSelectedExpense(null)}
          refetchParent={refetch}
        />
      )}
    </div>
  );
}
