// src/Pages/DeliveryOrder/DeliveryOrder.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import DeliverySelect from "./DeliverySelect";
import AllOrder from "./AllOrder";
import Current from "./Current";
import Return from "./Return";
import History from "./History";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";

export default function DeliveryOrder() {
  const [dateFrom, setDateFrom] = useState();
  const [dateTo, setDateTo] = useState();
  const [activeTab, setActiveTab] = useState("all");
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const { t, i18n } = useTranslation();



  const selectAllRef = useRef(null);

  const { postData, loading: postLoading } = usePost();

  const ASSIGN_ENDPOINT = "cashier/delivery/single_page/orders_delivery";
  const CONFIRM_ENDPOINT = "cashier/delivery_balance/confirm_faild_order";

  // All Orders data
  const { data: allData, isLoading: allLoading, refetch: refetchAll } = useGet(
    `cashier/delivery/single_page/orders?page=${currentPage}${dateFrom ? `&from=${format(dateFrom, "yyyy-MM-dd")}` : ""}${dateTo ? `&to=${format(dateTo, "yyyy-MM-dd")}` : ""}`,
    { enabled: activeTab === "all" }
  );
  // Returned/Failed Orders data
  const {
    data: returnedData,
    isLoading: returnedLoading,
    refetch: refetchReturned
  } = useGet(
    "cashier/delivery_balance/faild_orders",
    { enabled: activeTab === "returned" }
  );

  const allOrders = allData?.data || [];
  const returnedOrders = returnedData?.orders || [];


  const currentOrdersForReturned = returnedOrders;

  const isSelectionTab = activeTab === "all" || activeTab === "returned";

  // Pagination & Select All logic (للـ all و returned فقط)
  const currentOrders = activeTab === "all" ? (allData?.data || []) : (returnedData?.orders || []);
  const totalPages = allData?.last_page || 1;

  const pageAllSelected = currentOrders.every((o) => selectedOrders.includes(o.id));
  const pageSomeSelected = currentOrders.some((o) => selectedOrders.includes(o.id));

  const handlePageSelectAll = () => {
    if (pageAllSelected) {
      setSelectedOrders((prev) =>
        prev.filter((id) => !currentOrders.map((o) => o.id).includes(id))
      );
    } else {
      const newIds = currentOrders
        .map((o) => o.id)
        .filter((id) => !selectedOrders.includes(id));
      setSelectedOrders((prev) => [...new Set([...prev, ...newIds])]);
    }
  };

  useEffect(() => {
    if (selectAllRef.current && isSelectionTab) {
      selectAllRef.current.checked = pageAllSelected;
      selectAllRef.current.indeterminate = pageSomeSelected && !pageAllSelected;
    }
  }, [pageAllSelected, pageSomeSelected, isSelectionTab, currentOrders]);

  // Reset عند تبديل التب
  useEffect(() => {
    setCurrentPage(1);
    setSelectedOrders([]);
    setDateFrom(undefined);
    setDateTo(undefined);
    setSelectedDelivery(null);
  }, [activeTab]);

  const handleClearFilter = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
    toast.info("Filter cleared – showing all orders");
  };

  const handleAssign = async () => {
    if (!selectedDelivery || selectedOrders.length === 0) {
      toast.error("Select delivery & orders first");
      return;
    }

    try {
      await postData(ASSIGN_ENDPOINT, {
        delivery_id: selectedDelivery.id,
        order_ids: selectedOrders,
      });

      toast.success("Orders assigned successfully");
      setSelectedOrders([]);
      setCurrentPage(1);
      refetchAll();
    } catch (err) {
      toast.error("Failed to assign orders", err);
    }
  };

  const handleConfirmReturned = async () => {
    if (selectedOrders.length === 0) {
      toast.error("Select orders first");
      return;
    }

    try {
      await postData(CONFIRM_ENDPOINT, {
        order_ids: selectedOrders,
      });

      toast.success("Selected orders confirmed as returned");
      setSelectedOrders([]);
      setCurrentPage(1);
      refetchReturned();
    } catch (err) {
      toast.error("Failed to confirm returned orders", err);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">{t("AllOrders")}</TabsTrigger>
          <TabsTrigger value="current">{t("Current")}</TabsTrigger>
          <TabsTrigger value="returned">{t("Returned")}</TabsTrigger>
          <TabsTrigger value="history">{t("History")}</TabsTrigger>
        </TabsList>

        {/* All Orders Tab */}
        <TabsContent value="all" className="space-y-6">
          {/* Date Filters */}
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateFrom ? format(dateFrom, "PPP") : t("From")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[200px] justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateTo ? format(dateTo, "PPP") : t("To")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} />
              </PopoverContent>
            </Popover>

            {(dateFrom || dateTo) && (
              <Button onClick={handleClearFilter} variant="outline">
                {t("Clear Filter")}
              </Button>
            )}
          </div>

          {/* Assign Bar */}
          <div className="flex justify-between items-center gap-4">
            <div className="flex gap-3 items-center">
              <span className="text-sm text-muted-foreground">
                {t("Selected")} {selectedOrders.length} / {currentOrders.length}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrders(currentOrders.map((o) => o.id))}
                disabled={currentOrders.length === 0}
              >
                {t("SelectAll")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedOrders([])}
              >
                {t("ClearSelection")}
              </Button>

              <DeliverySelect
                value={selectedDelivery?.id}
                onChange={setSelectedDelivery}
              />

              <Button
                onClick={handleAssign}
                disabled={postLoading || selectedOrders.length === 0}
              >
                {t("AssignSelectedOrders")}
              </Button>
            </div>
          </div>

          {/* Table for All */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      onChange={handlePageSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t("OrderID")}</TableHead>
                  <TableHead>{t("OrderNumber")}</TableHead>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead>{t("Phone")}</TableHead>
                  <TableHead>{t("Address")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AllOrder
                  orders={currentOrders}
                  selectedOrders={selectedOrders}
                  setSelectedOrders={setSelectedOrders}
                  isLoading={allLoading}
                />
              </TableBody>
            </Table>

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-6 py-4 border-t">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" /> {t("Previous")}
                </Button>
                <span className="text-sm font-medium">
                  {t("Page")} {currentPage} {t("of")} {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  {t("Next")} <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Current Tab – محتوى مستقل تمامًا */}
        <TabsContent value="current">
          <Current />
        </TabsContent>

        {/* Returned / Failed Tab */}
        <TabsContent value="returned" className="space-y-6">
          {/* Confirm Bar */}
          {selectedOrders.length > 0 && (
            <div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-blue-900 font-medium">
                {selectedOrders.length} {selectedOrders.length === 1 ? "order" : "orders"} selected
              </span>
              <Button
                variant="destructive"
                onClick={handleConfirmReturned}
                disabled={postLoading}
              >
                Confirm Selected as Returned
              </Button>
            </div>
          )}

          {/* Table for Returned */}
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <input
                      type="checkbox"
                      ref={selectAllRef}
                      onChange={handlePageSelectAll}
                    />
                  </TableHead>
                  <TableHead>{t("OrderID")}</TableHead>
                  <TableHead>{t("OrderNumber")}</TableHead>
                  <TableHead>{t("Customer")}</TableHead>
                  <TableHead>{t("Phone")}</TableHead>
                  <TableHead>{t("Address")}</TableHead>
                  <TableHead>{t("Amount")}</TableHead>
                  <TableHead>{t("Date")}</TableHead>
                  <TableHead>{t("Time")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <Return
                  orders={currentOrders}
                  selectedOrders={selectedOrders}
                  setSelectedOrders={setSelectedOrders}
                  isLoading={returnedLoading}
                />
              </TableBody>
            </Table>

            {currentOrders.length > 0 && (
              <div className="flex items-center justify-center gap-6 py-4 border-t">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </Card>
        </TabsContent>

        {/* History Tab – مع جدول كامل و headers خاصة بالـ history */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="!text-center">ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Delivery</TableHead>
                  <TableHead>Financial</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead>Cashier Man</TableHead>
                  <TableHead>Cashier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <History />
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}