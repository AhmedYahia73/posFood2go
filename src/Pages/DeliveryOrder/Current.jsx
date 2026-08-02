import { getCurrencySymbol } from '../../utils/currency';
// src/Pages/DeliveryOrder/Current.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import DeliverySelect from "./DeliverySelect";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import Loading from "@/components/Loading";

export default function Current() {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [ordersData, setOrdersData] = useState({
    total_orders: [],
    total_amount: 0,
    on_the_way_amount: 0,
    cash_on_hand_amount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Payment modal states
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [financialAccount, setFinancialAccount] = useState("");
  const [last4Digits, setLast4Digits] = useState("");
  const [transactionId, setTransactionId] = useState("");

  const headerCheckboxRef = useRef(null);

  // Current orders data
  const { data: currentData, isLoading: currentLoading, refetch: refetchCurrent } = useGet(
    "cashier/delivery_balance/current_orders"
  );

  // Financial accounts list
  const { data: listsData, isLoading: listsLoading } = useGet("cashier/delivery_balance/lists");

  const financialAccounts = listsData?.financial_accounting || [];

  const { postData: filterData, loading: filterLoading } = usePost();
  const { postData: payData, loading: payLoading } = usePost();

  // تحميل البيانات الأساسية
  useEffect(() => {
    if (currentData) {
      setOrdersData(currentData);
      setLoading(false);
    }
  }, [currentData]);

  // فلترة عند اختيار مندوب
  const handleFilter = async (deliveryId) => {
    setLoading(true);
    try {
      const res = await filterData("cashier/delivery_balance/filter_current_orders", {
        delivery_id: deliveryId,
      });
      setOrdersData(res || { total_orders: [], total_amount: 0, on_the_way_amount: 0, cash_on_hand_amount: 0 });
      setSelectedOrders([]);
      toast.success("تم التصفية بنجاح");
    } catch (err) {
      toast.error("فشل في التصفية");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDelivery) {
      handleFilter(selectedDelivery.id);
    } else if (currentData) {
      setOrdersData(currentData);
      setSelectedOrders([]);
    }
  }, [selectedDelivery]);

  const handleClearFilter = () => {
    setSelectedDelivery(null);
    refetchCurrent();
    setSelectedOrders([]);
  };

  const orders = ordersData.total_orders || [];

  // حساب الإجمالي المختار
  const selectedTotal = orders
    .filter((o) => selectedOrders.includes(o.id))
    .reduce((sum, o) => sum + parseFloat(o.amount), 0);

  // حالة checkbox الرئيسي
  const allSelected = orders.length > 0 && orders.every((o) => selectedOrders.includes(o.id));
  const someSelected = selectedOrders.length > 0 && !allSelected;

  const handleHeaderCheckbox = () => {
    if (allSelected || someSelected) {
      setSelectedOrders([]);
    } else {
      setSelectedOrders(orders.map((o) => o.id));
    }
  };

  const toggleOrder = (id) => {
    setSelectedOrders((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // تحديث حالة indeterminate
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.checked = allSelected;
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [allSelected, someSelected, orders]);

  const handleCollectPayment = () => {
    if (selectedOrders.length === 0) {
      toast.error("اختر طلبات أولاً");
      return;
    }
    setPaymentModalOpen(true);
  };

  // تحديد ما إذا كان الحساب المختار يحتاج last 4 digits
  const selectedAccount = financialAccounts.find(acc => acc.id.toString() === financialAccount);
  const needsLast4Digits = selectedAccount?.description_status === 1;

  const handleConfirmPayment = async () => {
    if (!financialAccount) {
      toast.error("اختر حساب مالي");
      return;
    }
    if (needsLast4Digits && !last4Digits) {
      toast.error("أدخل آخر 4 أرقام للبطاقة");
      return;
    }

    try {
      const payload = {
        order_ids: selectedOrders,
        financial_id: financialAccount,
      };
      if (transactionId) payload.transition_id = transactionId;
      if (last4Digits) payload.last_four_digits = last4Digits;

      await payData("cashier/delivery_balance/pay_orders", payload);
      toast.success("تم تأكيد الدفع بنجاح");
      setPaymentModalOpen(false);
      setSelectedOrders([]);
      setFinancialAccount("");
      setLast4Digits("");
      setTransactionId("");

      // إعادة تحميل البيانات
      if (selectedDelivery) {
        handleFilter(selectedDelivery.id);
      } else {
        refetchCurrent();
      }
    } catch (err) {
      toast.error("فشل في تأكيد الدفع");
    }
  };

  if (loading || currentLoading || listsLoading) return <Loading />;

  return (
    <div className="space-y-6">
      {/* Select Delivery + Clear Filter */}
      <div className="flex items-center gap-4">
        <DeliverySelect
          value={selectedDelivery?.id}
          onChange={setSelectedDelivery}
        />
        {selectedDelivery && (
          <Button variant="destructive" onClick={handleClearFilter}>
            Clear Filter
          </Button>
        )}
      </div>

      {/* Selected orders bar */}
      {selectedOrders.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="font-medium text-blue-900">
            {selectedOrders.length} {selectedOrders.length === 1 ? "order" : "orders"} selected
            <span className="ml-4 font-bold">
              Total: {selectedTotal.toFixed(2)} {getCurrencySymbol()}
            </span>
          </div>
          <Button variant="destructive" onClick={handleCollectPayment}>
            Collect Payment
          </Button>
        </div>
      )}

      {/* Amount cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Card className="bg-blue-600 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg opacity-90">Total Amount</p>
            <p className="text-3xl font-bold">
              {parseFloat(ordersData.total_amount || 0).toFixed(2)} {getCurrencySymbol()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-600 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg opacity-90">On The Way</p>
            <p className="text-3xl font-bold">
              {parseFloat(ordersData.on_the_way_amount || 0).toFixed(2)} {getCurrencySymbol()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-600 text-white">
          <CardContent className="p-6 text-center">
            <p className="text-lg opacity-90">Cash On Hand</p>
            <p className="text-3xl font-bold">
              {parseFloat(ordersData.cash_on_hand_amount || 0).toFixed(2)} {getCurrencySymbol()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Orders table */}
      <Card>
        <div className="border-b p-4 font-semibold">
          Current Orders ({orders.length})
        </div>
        <Table>
          <TableHeader>
            <TableRow >
              <TableHead className="w-12">
                <Checkbox
                  ref={headerCheckboxRef}
                  onCheckedChange={handleHeaderCheckbox}
                />
              </TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Order Number</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Address</TableHead>
              <TableHead>Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                  No current orders found
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow className="!text-center" key={order.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrders.includes(order.id)}
                      onCheckedChange={() => toggleOrder(order.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{order.id}</TableCell>
                  <TableCell>{order.order_number}</TableCell>
                  <TableCell>{order.user.name}</TableCell>
                  <TableCell>{order.user.phone}</TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {order.address.address}
                  </TableCell>
                  <TableCell className="font-medium">
                    {parseFloat(order.amount).toFixed(2)} {getCurrencySymbol()}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Payment Modal */}
      <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Financial Account</Label>
              <Select value={financialAccount} onValueChange={setFinancialAccount}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {financialAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {needsLast4Digits && (
              <>


                <div className="space-y-2">
                  <Label>Last 4 Digits <span className="text-red-500">*</span></Label>
                  <Input
                    value={last4Digits}
                    onChange={(e) => setLast4Digits(e.target.value.replace(/\D/g, ""))}
                    placeholder="1234"
                    maxLength={4}
                  />
                </div>


                <div className="space-y-2">
                  <Label>Transaction ID (optional)</Label>
                  <Input
                    value={transactionId}
                    onChange={(e) => setTransactionId(e.target.value)}
                    placeholder="Enter transaction ID"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmPayment}
              disabled={payLoading}
            >
              Confirm Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}