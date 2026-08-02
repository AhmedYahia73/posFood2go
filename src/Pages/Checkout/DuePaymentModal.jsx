import { getCurrencySymbol } from '../../utils/currency';
import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGet } from "@/Hooks/useGet";
import { toast } from "react-toastify";
const DuePaymentModal = ({
  isOpen,
  onClose,
  customer,
  requiredTotal,
  onConfirm,
 refetch,
}) => {
  const branch_id = localStorage.getItem("branch_id");
  const { data } = useGet(`captain/selection_lists?branch_id=${branch_id}`);
  const [splits, setSplits] = useState([]);

  // حساب المبلغ المدفوع الآن
  const paidNow = useMemo(() => {
    return splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
  }, [splits]);

  // حساب المبلغ المتبقي (الآجل)
  const dueAmount = requiredTotal - paidNow;

  // إضافة طريقة دفع افتراضية عند فتح المودال
  useEffect(() => {
    if (data?.financial_account?.length > 0 && splits.length === 0) {
      const defaultAcc = data.financial_account[0];
      setSplits([
        {
          id: "due-split-1",
          accountId: defaultAcc.id,
          amount: 0,
          description: "",
        },
      ]);
    }
  }, [data]);

  // تحديث المبلغ لطريقة دفع معينة
  const handleAmountChange = (id, value) => {
    const num = parseFloat(value) || 0;
    if (num < 0) {
      toast.error("Amount cannot be negative.");
      return;
    }

    const totalOthers = splits.reduce(
      (sum, s) => (s.id === id ? sum : sum + s.amount),
      0
    );
    const maxAllowed = requiredTotal - totalOthers;

    if (num > maxAllowed) {
      toast.error(`Max allowed: ${maxAllowed.toFixed(2)} {getCurrencySymbol()}`);
      return;
    }

    setSplits((prev) => prev.map((s) => (s.id === id ? { ...s, amount: num } : s)));
  };

  // تغيير الحساب المالي (كاش، فيزا، إلخ)
  const handleAccountChange = (id, accId) => {
    setSplits((prev) =>
      prev.map((s) =>
        s.id === id ? { ...s, accountId: parseInt(accId), description: "" } : s
      )
    );
  };

  // تحديث وصف الدفع (آخر 4 أرقام للفيزا)
  const handleDescriptionChange = (id, value) => {
    setSplits((prev) =>
      prev.map((s) => (s.id === id ? { ...s, description: value } : s))
    );
  };

  // إضافة طريقة دفع جديدة
  const handleAddSplit = () => {
    const defaultAcc = data.financial_account[0]?.id;
    if (!defaultAcc) return toast.error("No accounts available.");
    setSplits((prev) => [
      ...prev,
      {
        id: `due-split-${Date.now()}`,
        accountId: defaultAcc,
        amount: 0,
        description: "",
      },
    ]);
  };

  // حذف طريقة دفع
  const handleRemoveSplit = (id) => {
    setSplits((prev) => prev.filter((s) => s.id !== id));
  };

  // الحصول على اسم الحساب من ID
  const getAccountNameById = (accountId) => {
    const acc = data?.financial_account?.find((a) => a.id === parseInt(accountId));
    return acc ? acc.name : "Select Account";
  };

  // التحقق من ضرورة إدخال وصف (للفيزا)
  const getDescriptionStatus = (accountId) => {
    const acc = data?.financial_account?.find((a) => a.id === parseInt(accountId));
    return acc?.description_status === 1;
  };

  // التحقق من صحة البيانات المدخلة
  const validateSplits = () => {
    for (const split of splits) {
      if (
        getDescriptionStatus(split.accountId) &&
        (!split.description || !/^\d{4}$/.test(split.description))
      ) {
        toast.error(`Please enter exactly 4 digits for the Visa card.`);
        return false;
      }
    }
    return true;
  };

  // تأكيد الدفع
const handleConfirm = () => {
  if (!validateSplits()) return;

  // المبلغ اللي اتدفع دلوقتي
  const totalPaidNow = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

  // المتبقي آجل بعد الدفعة دي
  const remainingDue = requiredTotal - totalPaidNow;

  // لو مفيش دفع خالص → منعه
  if (totalPaidNow <= 0) {
    toast.error("Please enter an amount greater than 0");
    return;
  }

  // تبعت: splits + المبلغ المدفوع + المتبقي
  onConfirm(splits, totalPaidNow, remainingDue);
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
      <div className="relative w-full max-w-2xl bg-white p-6 rounded-xl shadow-2xl">
        <button onClick={onClose} className="absolute top-4 right-4 text-xl">
          ×
        </button>

        <h2 className="text-2xl font-bold mb-4 text-red-600 text-center">
          Partial Payment & Due
        </h2>

        {/* معلومات الطلب */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium mb-2">
            Customer: <strong>{customer?.name}</strong> ({customer?.phone})
          </p>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Order:</span>
              <span className="font-bold">{requiredTotal.toFixed(2)} {getCurrencySymbol()}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Paid Now:</span>
              <span>{paidNow.toFixed(2)} {getCurrencySymbol()}</span>
            </div>
            <div className="flex justify-between text-red-600 font-bold">
              <span>Due Amount:</span>
              <span>{dueAmount.toFixed(2)} {getCurrencySymbol()}</span>
            </div>
          </div>
        </div>

        {/* طرق الدفع */}
        <div className="space-y-4">
          {splits.map((split) => (
            <div key={split.id} className="flex items-center space-x-3">
              {/* اختيار الحساب */}
              <div className="w-40">
                <Select
                  value={String(split.accountId)}
                  onValueChange={(val) => handleAccountChange(split.id, val)}
                >
                  <SelectTrigger>
                    <SelectValue>{getAccountNameById(split.accountId)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {data?.financial_account?.map((acc) => (
                      <SelectItem key={acc.id} value={String(acc.id)}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* المبلغ */}
              <div className="relative flex-grow">
                <Input
                  type="number"
                  min="0"
                  value={split.amount === 0 ? "" : String(split.amount)}
                  onChange={(e) => handleAmountChange(split.id, e.target.value)}
                  className="pl-14"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  EGP
                </span>
              </div>

              {/* آخر 4 أرقام للفيزا */}
              {getDescriptionStatus(split.accountId) && (
                <Input
                  type="text"
                  placeholder="Last 4 digits"
                  value={split.description}
                  onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                  maxLength={4}
                  className="w-24"
                />
              )}

              {/* زر الحذف */}
              {splits.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveSplit(split.id)}
                >
                  ×
                </Button>
              )}
            </div>
          ))}

          {/* زر إضافة طريقة دفع */}
          {paidNow < requiredTotal && (
            <Button
              variant="link"
              onClick={handleAddSplit}
              className="text-sm text-blue-600"
            >
              + Add Payment Method
            </Button>
          )}
        </div>

        {/* أزرار التحكم */}
        <div className="flex space-x-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={dueAmount < 0}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white"
          >
            Confirm Due Payment
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DuePaymentModal;