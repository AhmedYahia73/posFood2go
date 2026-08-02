import { getCurrencySymbol } from '../../utils/currency';
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import Loading from "@/components/Loading";
import {
  Search,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  Hourglass,
  CheckCircle,
  Package as PackageIcon,
  Truck,
  XCircle,
  RotateCw,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";

export default function OnlineOrders() {
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isArabic = i18n.language === "ar";

  // جلب الطلبات
  const { data, isLoading, error } = useGet("cashier/orders/online_orders");

  // جلب العدد للـ cards
  const { data: countDataRaw, isLoading: countLoading, error: countError } = useGet("cashier/orders/order_count");

  // استخدام optional chaining لتجنب الخطأ عندما يكون countDataRaw null أو undefined
  const countMap = {
    pending: countDataRaw?.pending ?? 0,
    confirmed: countDataRaw?.confirmed ?? 0,
    processing: countDataRaw?.processing ?? 0,
    out_for_delivery: countDataRaw?.out_for_delivery ?? 0,
    delivered: countDataRaw?.delivered ?? 0,
    returned: countDataRaw?.returned ?? 0,
    canceled: countDataRaw?.canceled ?? 0,
    refund: countDataRaw?.refund ?? 0,
    failed_to_deliver: countDataRaw?.faild_to_deliver ?? 0, // الـ API يحتوي على الخطأ الإملائي
  };

  // حالات الـ cards والفلتر (بدون failed_to_deliver في الفلتر الرئيسي لأنه منفصل في التصميم)
  const statusConfig = [
    { key: "pending", label: t("Pending"), icon: Hourglass, color: "text-red-600" },
    { key: "confirmed", label: t("Accept"), icon: CheckCircle, color: "text-green-600" },
    { key: "processing", label: t("Processing"), icon: PackageIcon, color: "text-purple-600" },
    { key: "out_for_delivery", label: t("OutforDelivery"), icon: Truck, color: "text-indigo-600" },
    { key: "delivered", label: t("Delivered"), icon: CheckCircle, color: "text-green-600" },
    { key: "canceled", label: t("Canceled"), icon: XCircle, color: "text-gray-600" },
    { key: "returned", label: t("Returned"), icon: RotateCw, color: "text-orange-600" },
    { key: "refund", label: t("Refund"), icon: DollarSign, color: "text-pink-600" },
  ];
  const failedConfig = { key: "failed_to_deliver", label: t("FailedToDeliver"), icon: AlertTriangle, color: "text-red-600" };

  // حالات الفلتر المؤقتة
  const [tempType, setTempType] = useState("all");
  const [tempStart, setTempStart] = useState("");
  const [tempEnd, setTempEnd] = useState("");

  // الحالات المطبقة فعلياً
  const [appliedType, setAppliedType] = useState("all");
  const [appliedStart, setAppliedStart] = useState(null);
  const [appliedEnd, setAppliedEnd] = useState(null);

  const handleApply = () => {
    setAppliedType(tempType);

    let start = tempStart ? new Date(tempStart) : null;
    let end = tempEnd ? new Date(tempEnd) : null;
    if (end) {
      end.setHours(23, 59, 59, 999);
    }
    setAppliedStart(start);
    setAppliedEnd(end);
  };

  const handleReset = () => {
    setTempType("all");
    setTempStart("");
    setTempEnd("");
    setAppliedType("all");
    setAppliedStart(null);
    setAppliedEnd(null);
  };

  // معالجة بيانات الطلبات + أخطاء العد
  useEffect(() => {
    if (data?.orders) {
      setOrders(data.orders);
      setFilteredOrders(data.orders);
    }
    if (error) {
      toast.error(t("FailedToFetchOrders") || "Failed to fetch orders");
    }
    if (countError) {
      toast.error(t("FailedToFetchCounts") || "Failed to fetch order counts");
    }
  }, [data, error, countError, t]);

  // الفلترة
  useEffect(() => {
    let filtered = orders;

    // البحث
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.f_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.l_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.user?.phone?.includes(searchTerm)
      );
    }

    // الـ type
    if (appliedType !== "all") {
      filtered = filtered.filter(order => order.order_status === appliedType);
    }

    // التاريخ
    if (appliedStart || appliedEnd) {
      filtered = filtered.filter(order => {
        const orderDate = new Date(order.created_at);
        if (appliedStart && orderDate < appliedStart) return false;
        if (appliedEnd && orderDate > appliedEnd) return false;
        return true;
      });
    }

    setFilteredOrders(filtered);
  }, [searchTerm, orders, appliedType, appliedStart, appliedEnd]);

  const getStatusColor = (status) => {
    const colors = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
      confirmed: "bg-blue-100 text-blue-800 border-blue-300",
      processing: "bg-purple-100 text-purple-800 border-purple-300",
      out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-300",
      delivered: "bg-green-100 text-green-800 border-green-300",
      returned: "bg-orange-100 text-orange-800 border-orange-300",
      failed_to_deliver: "bg-red-100 text-red-800 border-red-300",
      canceled: "bg-gray-100 text-gray-800 border-gray-300",
      scheduled: "bg-teal-100 text-teal-800 border-teal-300",
      refund: "bg-pink-100 text-pink-800 border-pink-300"
    };
    return colors[status] || "bg-gray-100 text-gray-800 border-gray-300";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleOrderClick = (id) => {
    navigate(`/online-orders/${id}`);
  };

  if (isLoading || countLoading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6" dir={isArabic ? "rtl" : "ltr"}>
      <ToastContainer />

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          {t("OnlineOrders") || "Online Orders"}
        </h1>
        <p className="text-gray-600">
          {t("TotalOrders") || "Total"}: <span className="font-semibold">{filteredOrders.length}</span>
        </p>
      </div>

      {/* قسم الفلتر الجديد (Type + Date Range) */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {t("SelectDateRange") || "Select Date Range"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          {/* Order Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("OrderType") || "Order Type"}:</label>
            <select
              value={tempType}
              onChange={(e) => setTempType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              {statusConfig.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("StartDate") || "Start Date"}:</label>
            <input
              type="date"
              value={tempStart}
              onChange={(e) => setTempStart(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t("EndDate") || "End Date"}:</label>
            <input
              type="date"
              value={tempEnd}
              onChange={(e) => setTempEnd(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="px-6 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50"
            >
              {t("Reset") || "Reset"}
            </button>
            <button
              onClick={handleApply}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              {t("ShowData") || "Show Data"}
            </button>
          </div>
        </div>
      </div>

      {/* Cards للعدد حسب الحالة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {statusConfig.map((s) => (
          <div key={s.key} className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center">
            <s.icon className={`w-12 h-12 ${s.color} mb-4`} />
            <p className="text-sm font-medium text-gray-600">{s.label}</p>
            <p className="text-3xl font-bold text-red-700 mt-2">{countMap[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Failed To Deliver منفصلة ومركزة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div />
        <div className="bg-white rounded-lg shadow-sm p-6 flex flex-col items-center">
          <failedConfig.icon className={`w-12 h-12 ${failedConfig.color} mb-4`} />
          <p className="text-sm font-medium text-gray-600">{failedConfig.label}</p>
          <p className="text-3xl font-bold text-red-700 mt-2">{countMap[failedConfig.key]}</p>
        </div>
        <div />
      </div>

      {/* البحث فقط (تم إزالة Status Filter القديم لتجنب التكرار) */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={t("SearchByOrderNumber") || "Search by order number, name, or phone..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* باقي الكود (الجدول وكروت الموبايل) بدون تغيير */}
      {/* Orders Table - Desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("OrderNumber") || "Order #"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("Customer") || "Customer"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("Branch") || "Branch"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("Amount") || "Amount"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("Status") || "Status"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("DateTime") || "Date/Time"}
                </th>
                <th className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${isArabic ? "text-right" : "text-left"}`}>
                  {t("Type") || "Type"}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  onClick={() => handleOrderClick(order.id)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="w-4 h-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {order.order_number}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="font-medium text-gray-900">
                        {order.user?.f_name} {order.user?.l_name}
                      </div>
                      <div className="text-gray-500">{order.user?.phone}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                      {order.branch?.name || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm font-medium text-gray-900">
                      {order.amount?.toFixed(2)} {getCurrencySymbol()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.order_status)}`}>
                      {t(order.order_status) || order.order_status.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDate(order.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 capitalize">
                      {order.order_type?.replace(/_/g, ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrders.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("NoOrdersFound") || "No orders found"}</p>
          </div>
        )}
      </div>

      {/* Orders Cards - Mobile */}
      <div className="md:hidden space-y-4">
        {filteredOrders.map((order) => (
          <div
            key={order.id}
            onClick={() => handleOrderClick(order.id)}
            className="bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <div className="flex items-center mb-1">
                  <Package className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="font-semibold text-gray-900">{order.order_number}</span>
                </div>
                <div className="text-sm text-gray-600">
                  {order.user?.f_name} {order.user?.l_name}
                </div>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(order.order_status)}`}>
                {t(order.order_status) || order.order_status.replace(/_/g, ' ')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mb-3">
              <div className="flex items-center text-gray-600">
                <span className="font-medium">{order.amount?.toFixed(2)}</span>
              </div>
              <div className="flex items-center text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                <span>{order.branch?.name || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-100">
              <div className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {formatDate(order.created_at)}
              </div>
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </div>
          </div>
        ))}

        {filteredOrders.length === 0 && (
          <div className="text-center py-12 bg-white rounded-lg">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">{t("NoOrdersFound") || "No orders found"}</p>
          </div>
        )}
      </div>
    </div>
  );
}