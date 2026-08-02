// -------------------------------------------
// Expense Name Input Instead of Expense Select
// -------------------------------------------

import React, { useState, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

export default function ExpensesModal({ onClose, expense = null, refetchParent }) {
    const { data, loading } = useGet("cashier/expenses_list/lists");
    const { postData } = usePost();
    const { t } = useTranslation();

    const isEditMode = !!expense;

    // 🔥 Replace expense_id with text input
    const [expense_name, setExpenseName] = useState("");
    const [category_id, setCategoryId] = useState("");
    const [amount, setAmount] = useState("");
    const [note, setNote] = useState("");

    // Load financial account
    const storedAcc = localStorage.getItem("financial_account");
    let initialFinancialId = "";

    try {
        const parsed = JSON.parse(storedAcc);
        if (Array.isArray(parsed) && parsed.length > 0) {
            initialFinancialId = parsed[0].id;
        } else if (parsed?.id) {
            initialFinancialId = parsed.id;
        }
    } catch {
        // Invalid JSON, ignore
    }

    const [financial_account_id, setFinancialAccountId] = useState(initialFinancialId);

    // -----------------------------
    // Populate fields for EDIT MODE
    // -----------------------------
    useEffect(() => {
        if (isEditMode && expense) {
            setExpenseName(expense.expense || expense.expense_name || "");
            setCategoryId(expense.category?.id || expense.category_id || "");
            setAmount(expense.amount || "");
            setNote(expense.note || "");
            setFinancialAccountId(
                expense.financial_account?.id ||
                expense.financial_account_id ||
                initialFinancialId
            );
        }
    }, [expense, isEditMode]);

    // -----------------------------
    // SUBMIT
    // -----------------------------
    const handleSubmit = async () => {
        if (!expense_name || !category_id || !amount) {
            toast.error(t("Pleasefillrequiredfields"));
            return;
        }

        if (!financial_account_id) {
            toast.error(t("Pleaseselectfinancialaccount"));
            return;
        }

        const body = {
            expense: expense_name,
            category_id,
            amount,
            financial_account_id,
            note,
        };

        try {
            if (isEditMode) {
                await postData(`cashier/expenses_list/update/${expense.id}`, body);
                toast.success(t("ExpenseUpdated"));
                if (refetchParent) refetchParent();
            } else {
                await postData("cashier/expenses_list/add", body);
                toast.success(t("ExpenseAdded"));
            }
            onClose();
        } catch (err) {
            // Axios error عادةً بيكون موجود هنا
            const message = err?.response?.data?.errors || err?.message || "Failed to save expense";
            toast.error(message);
            console.error("Expense submit error:", err);
        }

    };

    if (loading) return null;

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[9999]"
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}>
            <div className="bg-white rounded-xl p-6 w-[95%] max-w-md shadow-xl overflow-y-auto max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">

                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold">
                        {isEditMode ? t("EditExpense") : t("AddExpense")}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-black text-3xl font-bold"
                    >
                        X
                    </button>
                </div>

                {/* 🔥 EXPENSE NAME INPUT */}
                <label className="block font-semibold mb-1">{t("Expense")}</label>
                <input
                    type="text"
                    value={expense_name}
                    onChange={(e) => setExpenseName(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                    placeholder={t("ExpenseName") || "Enter Expense Name"}
                />

                {/* Category */}
                <label className="block font-semibold mb-1">{t("Category")}</label>
                <select
                    value={category_id}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                >
                    <option value="">{t("SelectCategory")}</option>
                    {data?.categories?.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                            {cat.name}
                        </option>
                    ))}
                </select>

                {/* Amount */}
                <label className="block font-semibold mb-1">{t("Amount")}</label>
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 0) setAmount(e.target.value);
                    }}
                    className="w-full p-2 border rounded mb-3"
                    placeholder={t("Enteramount")}
                    min="1"
                />

                {/* Note */}
                <label className="block font-semibold mb-1">{t("Note")}</label>
                <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                />

                {/* Financial Account */}
                <label className="block font-semibold mb-1">{t("FinancialAccount")}</label>
                <select
                    value={financial_account_id}
                    onChange={(e) => setFinancialAccountId(e.target.value)}
                    className="w-full p-2 border rounded mb-3"
                >
                    <option value="">{t("SelectAccount")}</option>
                    {data?.financial?.map((acc) => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name} - {acc.details}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleSubmit}
                    className="px-6 py-4 bg-bg-primary text-white rounded hover:bg-red-700 w-full"
                >
                    {isEditMode ? t("Update") : t("add")}
                </button>
            </div>
        </div>
    );
}
