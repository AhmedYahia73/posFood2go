import { useEffect, useState, useMemo, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";
import { Button } from "@/components/ui/button";
import {
  Circle,
  Hourglass,
  CheckCircle,
  ChefHat,
  Truck,
  Package,
  RefreshCw,
  Search,
  UtensilsCrossed,
  ShoppingBag,
  Layers,
  Clock,
  User,
} from "lucide-react";
import { usePut } from "@/Hooks/usePut";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { getCurrencySymbol } from "../utils/currency";

// حالات التحضير لكل نوع طلب
const TAKE_AWAY_STATUSES = {
  pick_up: {
    label: "Pick Up",
    icon: ChefHat,
    color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-600 bg-orange-50 border-orange-200 hover:bg-orange-100",
    activeColor: "bg-orange-600 text-white border-orange-600",
  },
};

const DELIVERY_STATUSES = {
  ready_for_delivery: {
    label: "Ready for Delivery",
    icon: Package,
    color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100",
    activeColor: "bg-blue-600 text-white border-blue-600",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    icon: Truck,
    color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100",
    activeColor: "bg-purple-600 text-white border-purple-600",
  },
  delivered: {
    label: "Delivered",
    icon: CheckCircle,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100",
    activeColor: "bg-emerald-600 text-white border-emerald-600",
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100",
    activeColor: "bg-green-600 text-white border-green-600",
  },
  returned: {
    label: "Returned",
    icon: Circle,
    color: "text-red-600 bg-red-50 border-red-200 hover:bg-red-100",
    activeColor: "bg-red-600 text-white border-red-600",
  },
};

// حالات الـ Dine In
const DINE_IN_STATUSES = {
  preparing: {
    label: "Preparing",
    icon: Hourglass,
    color: "text-orange-500",
  },
  done: {
    label: "Done",
    icon: CheckCircle,
    color: "text-green-500",
  },
  paid: {
    label: "Paid",
    icon: CheckCircle,
    color: "text-blue-600",
  },
};

// Helper to get safe order number
const getOrderNumber = (order) => {
  if (!order) return "";
  const num = order.order_number;
  if (num && num !== "null" && num !== "undefined" && String(num).trim() !== "") {
    return num;
  }
  const modNum = order.module_order_number;
  if (modNum && modNum !== "null" && modNum !== "undefined" && String(modNum).trim() !== "") {
    return modNum;
  }
  return order.id || order._id || "";
};

// Helper to get safe order date
const getOrderDate = (order) => {
  if (!order) return "";
  const d =
    order.createdAt ||
    order.created_at ||
    (order.date && order.date !== "null" ? order.date : "") ||
    (order.order_date && order.order_date !== "null" ? order.order_date : "");
  if (!d || d === "null" || d === "undefined") return "";
  try {
    const dateObj = new Date(d);
    if (!isNaN(dateObj.getTime())) {
      return (
        dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) +
        " " +
        dateObj.toLocaleDateString()
      );
    }
  } catch (e) {
    // fallback to string
  }
  return String(d);
};

// Helper to extract items safely from order
const getOrderItems = (order) => {
  if (!order) return [];
  let details = order.order_details || order.products || order.items || [];
  if (typeof details === "string") {
    try {
      details = JSON.parse(details);
    } catch (e) {
      details = [];
    }
  }
  if (!Array.isArray(details)) return [];

  const items = [];
  details.forEach((detail) => {
    if (!detail) return;

    // Collect variations from detail
    const variations = [];
    if (Array.isArray(detail.variations)) {
      detail.variations.forEach((v) => {
        const varName = v?.variation?.name || v?.name || "";
        const optNames = (v?.options || [])
          .map((o) => o?.name || o?.option_name)
          .filter(Boolean);
        if (optNames.length > 0) {
          variations.push(varName ? `${varName}: ${optNames.join(", ")}` : optNames.join(", "));
        }
      });
    } else if (Array.isArray(detail.variation)) {
      detail.variation.forEach((v) => {
        const name = v?.name || v?.option_name;
        if (name) variations.push(name);
      });
    }

    // Collect addons
    const addons = [];
    if (Array.isArray(detail.addons)) {
      detail.addons.forEach((a) => {
        const name = a?.name || a?.addon_name || a?.addon?.name;
        if (name) addons.push(name);
      });
    }

    // Collect extras
    const extras = [];
    if (Array.isArray(detail.extras) || Array.isArray(detail.extra_id)) {
      const arr = detail.extras || detail.extra_id;
      arr.forEach((e) => {
        const name = e?.name || e?.extra_name || e?.extra?.name;
        if (name) extras.push(name);
      });
    }

    // Collect excludes
    const excludes = [];
    if (Array.isArray(detail.excludes) || Array.isArray(detail.exclude_id)) {
      const arr = detail.excludes || detail.exclude_id;
      arr.forEach((ex) => {
        const name = ex?.name || ex?.exclude_name || ex?.exclude?.name;
        if (name) excludes.push(name);
      });
    }

    // 1. If detail.product is an Array
    if (Array.isArray(detail.product) && detail.product.length > 0) {
      detail.product.forEach((p) => {
        const prodObj = p?.product || p;
        const name =
          prodObj?.name ||
          prodObj?.product_name ||
          p?.name ||
          p?.product_name ||
          "Unknown Product";
        const count = parseFloat(p?.count || p?.quantity || detail.count || 1);
        const price = parseFloat(
          p?.price || prodObj?.final_price || prodObj?.price || detail.price || 0
        );
        items.push({
          name,
          count,
          price,
          notes: p?.notes || p?.note || detail.notes || detail.note || "",
          variations,
          addons,
          extras,
          excludes,
        });
      });
    }
    // 2. If detail.deals or detail.deal
    else if (detail.deal || detail.deals) {
      const dealObj = detail.deal || detail.deals;
      const name = dealObj?.name || dealObj?.title || detail?.name || "Deal";
      const count = parseFloat(detail.count || detail.quantity || 1);
      const price = parseFloat(detail.price || dealObj?.price || 0);
      items.push({
        name: `🎁 ${name}`,
        count,
        price,
        notes: detail.notes || detail.note || "",
        variations,
        addons,
        extras,
        excludes,
      });
    }
    // 3. If detail.product is an Object
    else if (detail.product && typeof detail.product === "object") {
      const prodObj = detail.product.product || detail.product;
      const name =
        prodObj?.name ||
        prodObj?.product_name ||
        detail.name ||
        detail.product_name ||
        "Unknown Product";
      const count = parseFloat(detail.product.count || detail.count || detail.quantity || 1);
      const price = parseFloat(
        detail.product.price || prodObj?.final_price || prodObj?.price || detail.price || 0
      );
      items.push({
        name,
        count,
        price,
        notes: detail.product.notes || detail.product.note || detail.notes || detail.note || "",
        variations,
        addons,
        extras,
        excludes,
      });
    }
    // 4. Fallback: detail itself has name or product_id
    else {
      const name =
        detail.name ||
        detail.product_name ||
        detail.title ||
        (detail.product_id ? `Product #${detail.product_id}` : "Unknown Product");
      const count = parseFloat(detail.count || detail.quantity || 1);
      const price = parseFloat(detail.price || 0);
      items.push({
        name,
        count,
        price,
        notes: detail.notes || detail.note || "",
        variations,
        addons,
        extras,
        excludes,
      });
    }
  });

  return items;
};

// Helper to compute safe order total
const getOrderTotal = (order) => {
  if (!order) return null;
  if (order.total_price !== undefined && order.total_price !== null && order.total_price !== "null") {
    const val = parseFloat(order.total_price);
    if (!isNaN(val)) return val;
  }
  if (order.amount !== undefined && order.amount !== null && order.amount !== "null") {
    const val = parseFloat(order.amount);
    if (!isNaN(val)) return val;
  }
  if (order.total !== undefined && order.total !== null && order.total !== "null") {
    const val = parseFloat(order.total);
    if (!isNaN(val)) return val;
  }
  if (order.grand_total !== undefined && order.grand_total !== null && order.grand_total !== "null") {
    const val = parseFloat(order.grand_total);
    if (!isNaN(val)) return val;
  }
  const items = getOrderItems(order);
  const sum = items.reduce(
    (acc, it) => acc + (parseFloat(it.price || 0) * (parseFloat(it.count) || 1)),
    0
  );
  return sum > 0 ? sum : null;
};

export default function OrdersView() {
  const location = useLocation();
  const { data, error, isLoading: isInitialLoading, refetch } = useGet(
    "cashier/home/cashier_data",
    { useCache: false }
  );
  const { putData } = usePut();
  const [search, setSearch] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Read initial tab preference from state or localStorage (default to 'all')
  const passedOrderType = location.state?.orderType;
  const savedOrderType = localStorage.getItem("order_view_tab") || "all";
  const [activeTab, setActiveTab] = useState(passedOrderType || savedOrderType || "all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  // Remember active tab in localStorage
  useEffect(() => {
    if (activeTab) {
      localStorage.setItem("order_view_tab", activeTab);
    }
  }, [activeTab]);

  // When switching tabs, reset the status filter to 'all'
  const handleTabChange = (tabKey) => {
    setActiveTab(tabKey);
    setStatusFilter("all");
  };

  // Group orders by type
  const takeAwayOrders = useMemo(() => {
    return (Array.isArray(data?.take_away) ? data.take_away : []).map((o) => ({
      ...o,
      _type: "take_away",
    }));
  }, [data]);

  const dineInOrders = useMemo(() => {
    return (Array.isArray(data?.dine_in) ? data.dine_in : []).map((o) => ({
      ...o,
      _type: "dine_in",
    }));
  }, [data]);

  const deliveryOrders = useMemo(() => {
    return (Array.isArray(data?.delivery) ? data.delivery : []).map((o) => ({
      ...o,
      _type: "delivery",
    }));
  }, [data]);

  const allOrders = useMemo(() => {
    return [...takeAwayOrders, ...dineInOrders, ...deliveryOrders].sort((a, b) => {
      const dateA = new Date(a.created_at || a.createdAt || 0).getTime();
      const dateB = new Date(b.created_at || b.createdAt || 0).getTime();
      return (dateB || 0) - (dateA || 0) || (b.id || 0) - (a.id || 0);
    });
  }, [takeAwayOrders, dineInOrders, deliveryOrders]);

  // Tab orders before status / search filtering
  const currentTabOrders = useMemo(() => {
    if (activeTab === "take_away") return takeAwayOrders;
    if (activeTab === "dine_in") return dineInOrders;
    if (activeTab === "delivery") return deliveryOrders;
    return allOrders;
  }, [activeTab, takeAwayOrders, dineInOrders, deliveryOrders, allOrders]);

  // Track statuses for button states
  const [statuses, setStatuses] = useState({});
  useEffect(() => {
    if (data) {
      const initialStatuses = {};
      [...takeAwayOrders, ...dineInOrders, ...deliveryOrders].forEach((order) => {
        const orderId = order.id || order._id;
        const oType = order._type || order.order_type;
        initialStatuses[orderId] =
          oType === "take_away"
            ? (order.take_away_status || order.order_status || "pick_up")
            : oType === "delivery"
            ? (order.delivery_status || order.order_status || "watting")
            : (order.order_status || "preparing");
      });
      setStatuses((prev) => ({ ...initialStatuses, ...prev }));
    }
  }, [data, takeAwayOrders, dineInOrders, deliveryOrders]);

  const [updatingStatus, setUpdatingStatus] = useState({});

  // Manual refresh handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      if (refetch) {
        await refetch("cashier/home/cashier_data", true);
      }
      toast.success(isArabic ? "تم تحديث البيانات بنجاح" : "Data refreshed successfully");
    } catch (err) {
      toast.error(isArabic ? "فشل تحديث البيانات" : "Failed to refresh data");
    } finally {
      setIsRefreshing(false);
    }
  };

  // Change order status
  const handleStatusChange = async (orderId, newStatus, itemOrderType) => {
    setUpdatingStatus((prev) => ({ ...prev, [orderId]: true }));

    const targetType = itemOrderType || (activeTab !== "all" ? activeTab : "take_away");
    let url = "";
    let payload = {};

    if (targetType === "take_away") {
      url = `cashier/take_away_status/${orderId}`;
      payload = { take_away_status: newStatus };
    } else if (targetType === "delivery") {
      url = `cashier/order_status/${orderId}`;
      payload = { delivery_status: newStatus };
    }

    if (url) {
      try {
        const response = await putData(url, payload);
        if (response && (response.success || response.status === 200 || response.data)) {
          setStatuses((prev) => ({
            ...prev,
            [orderId]: newStatus,
          }));
          toast.success(t("Statusupdatedsuccessfully") || "Status updated successfully");
          if (refetch) {
            refetch("cashier/home/cashier_data", true).catch(() => {});
          }
        } else {
          toast.error(t("Failedtoupdatestatus") || "Failed to update status");
        }
      } catch (err) {
        toast.error(t("Errorupdatingstatus") || "Error updating status");
      } finally {
        setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
      }
    } else {
      setUpdatingStatus((prev) => ({ ...prev, [orderId]: false }));
    }
  };

  // Filtered orders (by statusFilter and search query)
  const filteredOrders = useMemo(() => {
    return currentTabOrders.filter((order) => {
      const orderId = order.id || order._id;
      const oType = order._type || order.order_type;
      const status =
        statuses[orderId] ||
        (oType === "take_away"
          ? (order.take_away_status || order.order_status || "pick_up")
          : oType === "delivery"
          ? (order.delivery_status || order.order_status || "watting")
          : (order.order_status || "preparing"));

      // Status pill filter
      if (statusFilter !== "all" && status !== statusFilter) {
        return false;
      }

      // Search query
      if (!search || search.trim() === "") return true;

      const query = search.trim().toLowerCase();
      const orderNum = String(getOrderNumber(order)).toLowerCase();
      const id = String(order.id || order._id || "").toLowerCase();
      const modNum = String(order.module_order_number || "").toLowerCase();
      const customerName = String(
        order.customer_name || order.user?.name || order.client_name || ""
      ).toLowerCase();
      const tableName = String(
        order.table?.name || order.table_name || order.table_id || ""
      ).toLowerCase();

      const items = getOrderItems(order);
      const itemsMatch = items.some((it) => it.name.toLowerCase().includes(query));

      return (
        orderNum.includes(query) ||
        id.includes(query) ||
        modNum.includes(query) ||
        customerName.includes(query) ||
        tableName.includes(query) ||
        itemsMatch
      );
    });
  }, [currentTabOrders, statuses, statusFilter, search]);

  // Extract unique statuses present in current tab for quick status pill filtering
  const availableFilterStatuses = useMemo(() => {
    const set = new Set();
    currentTabOrders.forEach((o) => {
      const orderId = o.id || o._id;
      const oType = o._type || o.order_type;
      const st =
        statuses[orderId] ||
        (oType === "take_away"
          ? (o.take_away_status || o.order_status || "pick_up")
          : oType === "delivery"
          ? (o.delivery_status || o.order_status || "watting")
          : (o.order_status || "preparing"));
      if (st) set.add(st);
    });
    return Array.from(set);
  }, [currentTabOrders, statuses]);

  // Get status action buttons for a specific order
  const getAvailableStatusesForOrder = (order) => {
    const oType = order._type || order.order_type;
    if (oType === "take_away") return TAKE_AWAY_STATUSES;
    if (oType === "delivery") return DELIVERY_STATUSES;
    return {};
  };

  if (isInitialLoading && !data) return <Loading />;
  if (error && !data) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-red-500 font-medium text-lg">{t("Error loading data.") || "Error loading data."}</p>
        <Button onClick={handleRefresh} variant="outline" className="gap-2">
          <RefreshCw size={16} /> {isArabic ? "إعادة المحاولة" : "Try Again"}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto" dir={isArabic ? "rtl" : "ltr"}>
      {/* Header with Title and Refresh */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ShoppingBag className="text-amber-600" size={26} />
            {t("Orders") || (isArabic ? "الطلبات" : "Orders")}
            <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2.5 py-0.5 rounded-full border">
              {allOrders.length} {isArabic ? "طلب" : "orders"}
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isArabic ? "متابعة وإدارة طلبات الكاشير الحالية" : "View and manage current cashier orders"}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Search */}
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-2.5 text-gray-400" size={16} />
            <Input
              type="text"
              placeholder={t("SearchOrderNumber") || (isArabic ? "ابحث برقم الطلب أو العميل" : "Search order # or customer")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 rtl:pl-3 rtl:pr-9 h-10 w-full"
            />
          </div>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="h-10 w-10 shrink-0"
            title={isArabic ? "تحديث البيانات" : "Refresh data"}
          >
            <RefreshCw size={16} className={isRefreshing ? "animate-spin text-amber-600" : ""} />
          </Button>
        </div>
      </div>

      {/* Order Type Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        <button
          onClick={() => handleTabChange("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "all"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Layers size={16} />
          <span>{isArabic ? "الكل" : "All"}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "all" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {allOrders.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("take_away")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "take_away"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <ChefHat size={16} />
          <span>{isArabic ? "استلام شخصي (سفري)" : "Take Away"}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "take_away" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {takeAwayOrders.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("dine_in")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "dine_in"
              ? "bg-amber-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <UtensilsCrossed size={16} />
          <span>{isArabic ? "صالة" : "Dine In"}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "dine_in" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {dineInOrders.length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange("delivery")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === "delivery"
              ? "bg-purple-600 text-white shadow-sm"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Truck size={16} />
          <span>{isArabic ? "توصيل" : "Delivery"}</span>
          <span
            className={`text-xs px-2 py-0.5 rounded-full ${
              activeTab === "delivery" ? "bg-white/25 text-white" : "bg-gray-200 text-gray-700"
            }`}
          >
            {deliveryOrders.length}
          </span>
        </button>
      </div>

      {/* Quick Status Filter Pills (if multiple statuses exist) */}
      {availableFilterStatuses.length > 1 && (
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-gray-500 font-medium ml-1 mr-1">
            {isArabic ? "تصفية بالحالة:" : "Filter Status:"}
          </span>
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1 rounded-full border transition-colors ${
              statusFilter === "all"
                ? "bg-gray-800 text-white border-gray-800"
                : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
            }`}
          >
            {isArabic ? "كل الحالات" : "All"} ({currentTabOrders.length})
          </button>
          {availableFilterStatuses.map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1 rounded-full border transition-colors capitalize ${
                statusFilter === st
                  ? "bg-gray-800 text-white border-gray-800"
                  : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {st.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      )}

      {/* Orders Grid or Empty State */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-xl border border-dashed space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <ShoppingBag size={28} />
          </div>
          <p className="text-gray-600 font-medium text-base">
            {search ? (isArabic ? "لا توجد نتائج مطابقة للبحث" : "No orders matching your search") : t("Noordersfound") || "No orders found"}
          </p>
          {search && (
            <Button variant="outline" size="sm" onClick={() => setSearch("")}>
              {isArabic ? "مسح البحث" : "Clear search"}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => {
            const orderId = order.id || order._id;
            const items = getOrderItems(order);
            const orderNum = getOrderNumber(order);
            const orderDate = getOrderDate(order);
            const orderTotal = getOrderTotal(order);
            const oType = order._type || order.order_type;
            const currentStatus =
              statuses[orderId] ||
              (oType === "take_away"
                ? (order.take_away_status || order.order_status || "pick_up")
                : oType === "delivery"
                ? (order.delivery_status || order.order_status || "watting")
                : (order.order_status || "preparing"));

            const availableStatuses = getAvailableStatusesForOrder(order);

            // Type badge styling
            const typeBadgeConfig =
              oType === "take_away"
                ? { label: isArabic ? "استلام" : "Take Away", color: "bg-blue-50 text-blue-700 border-blue-200" }
                : oType === "dine_in"
                ? { label: isArabic ? "صالة" : "Dine In", color: "bg-amber-50 text-amber-700 border-amber-200" }
                : { label: isArabic ? "توصيل" : "Delivery", color: "bg-purple-50 text-purple-700 border-purple-200" };

            return (
              <Card
                key={orderId}
                className="border shadow-xs hover:shadow-md transition-shadow bg-white flex flex-col justify-between rounded-xl overflow-hidden"
              >
                <CardContent className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                  {/* Card Header */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-lg text-gray-900">#{orderNum}</span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md font-semibold border ${typeBadgeConfig.color}`}
                        >
                          {typeBadgeConfig.label}
                        </span>
                        {/* Table badge if Dine In */}
                        {oType === "dine_in" && (order.table?.name || order.table_name || order.table_id) && (
                          <span className="text-xs px-2 py-0.5 rounded-md font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {order.table?.name || order.table_name || `Table #${order.table_id}`}
                          </span>
                        )}
                      </div>

                      {/* Total Amount */}
                      {orderTotal !== null && orderTotal !== undefined && (
                        <div className="text-right rtl:text-left shrink-0">
                          <span className="font-bold text-base text-gray-900">
                            {Number(orderTotal).toFixed(2)}
                          </span>{" "}
                          <span className="text-xs text-gray-500">{getCurrencySymbol()}</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata Row: Date / Prep Time / User */}
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 gap-x-3 gap-y-1 border-b pb-2.5">
                      {orderDate && (
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-gray-400" />
                          {orderDate}
                        </span>
                      )}

                      {order.food_preparion_time && (
                        <span className="text-amber-600 font-medium">
                          ⏱️ {order.food_preparion_time}
                        </span>
                      )}

                      {(order.customer_name || order.user?.name) && (
                        <span className="flex items-center gap-1 text-gray-600 font-medium">
                          <User size={12} className="text-gray-400" />
                          {order.customer_name || order.user?.name}
                        </span>
                      )}
                    </div>

                    {/* Order General Notes */}
                    {order.notes &&
                      order.notes !== "null" &&
                      order.notes !== "note" &&
                      String(order.notes).trim() !== "" && (
                        <p className="text-xs text-amber-800 bg-amber-50/80 p-2 rounded-md border border-amber-200">
                          <span className="font-semibold">{t("Notes") || "Notes"}: </span>
                          {order.notes}
                        </p>
                      )}

                    {/* Items List */}
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {t("Items") || (isArabic ? "العناصر" : "Items")} ({items.length})
                      </p>
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="text-sm text-gray-800 bg-gray-50/70 p-2 rounded-md border border-gray-100"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-medium text-gray-900">
                                {item.name}{" "}
                                <span className="font-bold text-amber-700">× {item.count}</span>
                              </span>
                              {item.price > 0 && (
                                <span className="text-xs text-gray-500">
                                  {(item.price * item.count).toFixed(2)} {getCurrencySymbol()}
                                </span>
                              )}
                            </div>

                            {/* Variations */}
                            {item.variations?.length > 0 && (
                              <div className="text-xs text-blue-600 mt-0.5">
                                {item.variations.join(" • ")}
                              </div>
                            )}

                            {/* Addons & Extras */}
                            {(item.addons?.length > 0 || item.extras?.length > 0) && (
                              <div className="text-xs text-emerald-600 mt-0.5">
                                + {[...(item.addons || []), ...(item.extras || [])].join(", ")}
                              </div>
                            )}

                            {/* Excludes */}
                            {item.excludes?.length > 0 && (
                              <div className="text-xs text-red-500 mt-0.5">
                                - {item.excludes.join(", ")}
                              </div>
                            )}

                            {/* Item Notes */}
                            {item.notes &&
                              item.notes !== "null" &&
                              item.notes !== "note" &&
                              String(item.notes).trim() !== "" && (
                                <div className="text-xs text-gray-500 italic mt-0.5">
                                  💬 {item.notes}
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Status Action Buttons (Take Away & Delivery) */}
                  {Object.keys(availableStatuses).length > 0 && (
                    <div className="border-t pt-3 mt-3">
                      <div className="text-xs text-gray-500 mb-1.5 font-medium">
                        {isArabic ? "حالة الطلب:" : "Order Status:"}
                      </div>
                      <div className="flex gap-1.5 flex-wrap">
                        {Object.entries(availableStatuses).map(([key, value]) => {
                          const isActive = currentStatus === key;
                          const IconComponent = value.icon;
                          return (
                            <Button
                              key={key}
                              size="sm"
                              variant={isActive ? "default" : "outline"}
                              className={`text-xs h-8 px-2.5 transition-all ${
                                isActive ? value.activeColor : value.color
                              }`}
                              disabled={updatingStatus[orderId]}
                              onClick={() => handleStatusChange(orderId, key, oType)}
                            >
                              <IconComponent size={14} className="mr-1 rtl:mr-0 rtl:ml-1" />
                              {t(value.label) || value.label}
                            </Button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}