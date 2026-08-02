// src/hooks/useConfirmDuePayment.js
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";

export const useConfirmDuePayment = ({
  onClearCart,
  onClose,
  setDueSplits,
  setDueAmount,
  refetch,
}) => {
  const { postData } = usePost();

  const handleConfirmDuePayment = async (splits, dueAmt, selectedCustomer = null) => {
    // Validate selectedCustomer
    if (!selectedCustomer || !selectedCustomer.id) {
      toast.error("Customer information is missing. Please try again.");
      return;
    }

    setDueSplits(splits);
    setDueAmount(dueAmt);

    const formData = new FormData();
    formData.append("user_id", selectedCustomer.id.toString());
    formData.append("amount", dueAmt.toString());

    splits.forEach((split, index) => {
      formData.append(`financials[${index}][id]`, split.accountId.toString());
      formData.append(`financials[${index}][amount]`, split.amount.toString());
      if (split.description) {
        formData.append(`financials[${index}][description]`, split.description);
      }
    });

    try {
      await postData("cashier/customer/pay_debit", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Due order processed successfully!");
      if (typeof refetch === "function") {
    refetch();
  }
      onClearCart();
      onClose();
    } catch (e) {
      console.error("Due payment error:", e);
      toast.error(e.message || "Failed to process due payment.");
    }
  };

  return { handleConfirmDuePayment };
};