import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users,
  ChevronDown,
  Check,
  CheckCircle,
  Clock,
  ShoppingCart,
  CreditCard,
  UserCheck,
  Link,
  X,
  Scissors,
} from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { usePut } from "@/Hooks/usePut";
import Loading from "@/components/Loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { processProductItem } from "../Checkout/processProductItem";
import TableManagementActions from "./TableManagementActions";
// 🟢 Modal لإدخال رقم التحضير
const PreparationNumberModal = ({ isOpen, onClose, onSubmit, loading, tableName }) => {
  const [preparationNum, setPreparationNum] = useState("");
  const { t } = useTranslation();
  const handleSubmit = () => {
    if (!preparationNum.trim()) {
      toast.error(t("PleaseEnterPreparationNumber"));
      return;
    }
    onSubmit(preparationNum);
  };
  const handleCancel = () => {
    setPreparationNum("");
    onClose();
  };
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 p-4">
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-red-700 p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {t("EnterPreparationNumber")}
            </h2>
            <button
              onClick={handleCancel}
              disabled={loading}
              className="text-white hover:bg-white/20 rounded-full p-2 transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <p className="text-blue-100 text-sm mt-2">
            {t("Table")}: <span className="font-semibold">{tableName}</span>
          </p>
        </div>
        {/* Body */}
        <div className="p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            {t("PreparationNumber")}
          </label>
          <Input
            type="text"
            placeholder={t("EnterNumber")}
            value={preparationNum}
            onChange={(e) => setPreparationNum(e.target.value)}
            disabled={loading}
            className="w-full text-lg py-3 px-4 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-2 focus:ring-red-200"
            autoFocus
            onKeyPress={(e) => {
              if (e.key === "Enter") {
                handleSubmit();
              }
            }}
          />

          <p className="text-xs text-gray-500 mt-2">
            {t("PreparationNumberHint")}
          </p>
        </div>
        {/* Footer */}
        <div className="flex gap-3 p-6 pt-0">
          <Button
            onClick={handleCancel}
            disabled={loading}
            variant="outline"
            className="flex-1 py-3 text-base font-semibold border-2 hover:bg-gray-100"
          >
            {t("Cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !preparationNum.trim()}
            className="flex-1 py-3 text-base font-semibold bg-red-600 hover:bg-red-700 text-white"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                {t("Processing")}
              </span>
            ) : (
              t("Confirm")
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
const CustomStatusSelect = ({ table, statusOptions, onStatusChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const currentStatus = statusOptions.find(
    (option) => option.value === table.current_status
  );
  const handleStatusSelect = (statusValue) => {
    onStatusChange(statusValue);
    setIsOpen(false);
  };
  return (
    <div
      className={`relative w-full ${isOpen ? "z-[9999]" : "z-[1]"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all duration-200"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-1">
          {currentStatus?.icon && (
            <currentStatus.icon size={12} className={currentStatus.iconColor} />
          )}
          <span className="truncate">{currentStatus?.label || "Status"}</span>
        </div>
        <ChevronDown
          size={12}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 z-[99999]">
          <div className="bg-white border border-gray-300 rounded-md shadow-xl overflow-hidden text-xs">
            {statusOptions.map((option) => (
              <button
                key={option.value}
                className="w-full px-2 py-2 text-left flex items-center justify-between hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                onClick={() => handleStatusSelect(option.value)}
              >
                <div className="flex items-center gap-2">
                  <option.icon size={12} className={option.iconColor} />
                  <span>{option.label}</span>
                </div>
                {table.current_status === option.value && (
                  <Check size={12} className="text-blue-500" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
const Dine = () => {
  const navigate = useNavigate();
  const branch_id = localStorage.getItem("branch_id");
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const [selectedTable, setSelectedTable] = useState(null);
  const [selectedLocationId, setSelectedLocationId] = useState(null);
  const locale = isArabic ? "ar" : "en";
  const orderType = localStorage.getItem("order_type") || "dine_in";
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTablesList, setSelectedTablesList] = useState([]);
  // 🟢 State للـ Preparation Number Modal
  const [showPreparationModal, setShowPreparationModal] = useState(false);
  const [pendingTableSelection, setPendingTableSelection] = useState(null);
  const [handleSplitFromActions, setHandleSplitFromActions] = useState(null);
  const { data, isLoading, error, refetch } = useGet(
    `captain/lists?branch_id=${branch_id}&module=${orderType}`
  );
  const { loading: transferLoading, postData } = usePost();
  const { postData: postPreparationNum, loading: preparationLoading } = usePost();
  const locations = data?.cafe_location || [];
  const statusOptions = [
    {
      label: t("Available"),
      value: "available",
      icon: CheckCircle,
      iconColor: "text-gray-500",
    },
    {
      label: t("Preorder"),
      value: "not_available_pre_order",
      icon: Clock,
      iconColor: "text-orange-500",
    },
    {
      label: t("Withorder"),
      value: "not_available_with_order",
      icon: ShoppingCart,
      iconColor: "text-red-500",
    },
    {
      label: t("Reserved"),
      value: "reserved",
      icon: UserCheck,
      iconColor: "text-blue-500",
    },
    {
      label: t("Checkout"),
      value: "not_available_but_checkout",
      icon: CreditCard,
      iconColor: "text-green-500",
    },
  ];
  const processTablesWithMerge = (tables) => {
    return tables.map((table) => {
      if (table.sub_table && table.sub_table.length > 0) {
        return {
          ...table,
          isMerged: true,
          subTables: table.sub_table,
          mergedTableNumbers: [
            table.table_number,
            ...table.sub_table.map((s) => s.table_number),
          ].join(" + "),
        };
      }
      return { ...table, isMerged: false };
    });
  };
  useEffect(() => {
    const storedTableId = localStorage.getItem("table_id");
    if (storedTableId) setSelectedTable(parseInt(storedTableId));
    if (locations.length > 0 && !selectedLocationId) {
      setSelectedLocationId(locations[0].id);
    }
  }, [locations, selectedLocationId]);
  useEffect(() => {
    if (localStorage.getItem("transfer_pending") === "true") {
      toast.info(t("SelectNewTableToTransferOrder"));
    }
  }, []);
  const selectedLocation = locations.find(
    (loc) => loc.id === selectedLocationId
  );
  const tablesToDisplay = processTablesWithMerge(
    selectedLocation?.tables || []
  );
  const getTableColor = (state) => {
    const colors = {
      available: "bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200",
      not_available_pre_order:
        "bg-orange-100 text-orange-700 border-orange-300 hover:bg-orange-200",
      not_available_with_order:
        "bg-red-100 text-red-700 border-red-300 hover:bg-red-200",
      not_available_but_checkout:
        "bg-green-100 text-green-700 border-green-300 hover:bg-green-200",
      reserved: "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200",
    };
    return colors[state] || colors.available;
  };
  // 🟢 دالة للتنقل بعد إدخال رقم التحضير أو الإلغاء
  const proceedToOrderPage = (table, preparationNumber = null) => {
    localStorage.setItem("table_id", table.id);
    localStorage.setItem("order_type", "dine_in");
    localStorage.setItem("hall_name", selectedLocation?.name || "");
    localStorage.setItem("table_number", table.table_number || "");

    if (preparationNumber) {
      localStorage.setItem("preparation_number", preparationNumber);
    }
    navigate("/order-page", {
      state: {
        order_type: "dine_in",
        table_id: table.id,
        preparation_number: preparationNumber
      },
    });
    setSelectedTable(table.id);
  };
  // 🟢 دالة إرسال رقم التحضير للباك
  const handleSubmitPreparationNumber = async (preparationNum) => {
    if (!pendingTableSelection) return;
    try {
      const response = await postPreparationNum("cashier/preparation_num", {
        table_id: pendingTableSelection.id,
        preparation_num: preparationNum,
      });
      if (response?.success || response) {
        toast.success(t("PreparationNumberSaved"));
        setShowPreparationModal(false);
        proceedToOrderPage(pendingTableSelection, preparationNum);
        setPendingTableSelection(null);
      } else {
        toast.error(response?.message || t("FailedToSavePreparationNumber"));
      }
    } catch (err) {
      console.error("Preparation number error details:", err);

      // استخراج الرسالة من هيكل Axios الصحيح كما يظهر في الكونسول لديك
      const serverMessage =
        err.response?.data?.errors?.preparation_num?.[0] || // المسار الأول: errors.preparation_num[0]
        err.response?.data?.message ||                       // المسار الثاني: message العامة
        t("FailedToSavePreparationNumber");                 // المسار الثالث: نص احتياطي
      console.log(serverMessage);

      toast.error(serverMessage);
    }
  };
  // 🟢 دالة الإلغاء (Cancel) - التنقل بدون رقم تحضير
  const handleCancelPreparationModal = () => {
    setShowPreparationModal(false);
    if (pendingTableSelection) {
      proceedToOrderPage(pendingTableSelection, null);
      setPendingTableSelection(null);
    }
  };
  const handleSelectTable = async (table) => {
    if (isSelectionMode) {
      setSelectedTablesList(prev =>
        prev.includes(table.id)
          ? prev.filter(id => id !== table.id)
          : [...prev, table.id]
      );
      return;
    }

    const takeawayTransferPending = localStorage.getItem("transfer_takeaway_to_dine_in") === "true";
    if (takeawayTransferPending) {
      const transferDataString = localStorage.getItem("transfer_takeaway_order");
      if (!transferDataString) {
        toast.error(t("NoOrderDataFoundForTransfer"));
        return;
      }

      try {
        const transferData = JSON.parse(transferDataString);
        const products = transferData.orderItems.map(processProductItem);

        const formData = new FormData();
        formData.append("table_id", table.id);
        formData.append("amount", transferData.amount);
        formData.append("total_tax", transferData.totalTax);
        formData.append("total_discount", transferData.totalDiscount || "0");
        formData.append("notes", transferData.notes || "");

        products.forEach((product, index) => {
          formData.append(`products[${index}][product_id]`, product.product_id);
          formData.append(`products[${index}][count]`, product.count);
          formData.append(`products[${index}][price]`, product.price);
          if (product.note) formData.append(`products[${index}][note]`, product.note);

          // Variations
          if (product.variation && product.variation.length > 0) {
            product.variation.forEach((v, vIndex) => {
              formData.append(`products[${index}][variation][${vIndex}][variation_id]`, v.variation_id);
              v.option_id.forEach((optId, optIndex) => {
                formData.append(`products[${index}][variation][${vIndex}][option_id][${optIndex}]`, optId);
              });
            });
          }

          // Addons
          if (product.addons && product.addons.length > 0) {
            product.addons.forEach((addon, aIndex) => {
              formData.append(`products[${index}][addons][${aIndex}][addon_id]`, addon.addon_id);
              formData.append(`products[${index}][addons][${aIndex}][count]`, addon.count);
              formData.append(`products[${index}][addons][${aIndex}][price]`, addon.price);
            });
          }

          // Extras
          if (product.extra_id && product.extra_id.length > 0) {
            product.extra_id.forEach((extId, eIndex) => {
              formData.append(`products[${index}][extra_id][${eIndex}]`, extId);
            });
          }

          // Excludes
          if (product.exclude_id && product.exclude_id.length > 0) {
            product.exclude_id.forEach((exId, exIndex) => {
              formData.append(`products[${index}][exclude_id][${exIndex}]`, exId);
            });
          }
        });

        const response = await postData("cashier/take_away_dine_in", formData);

        if (response?.success || response) {
          toast.success(t("OrderTransferredSuccessfully"));
          localStorage.removeItem("transfer_takeaway_to_dine_in");
          localStorage.removeItem("transfer_takeaway_order");

          // Redirect to order page for the new table in Dine In mode
          proceedToOrderPage(table, null);
        }
      } catch (err) {
        console.error("Transfer error:", err);
        toast.error(err.response?.data?.message || t("FailedToTransferOrder"));
      }
      return;
    }

    const transferPending = localStorage.getItem("transfer_pending") === "true";
    const sourceTableId = localStorage.getItem("transfer_source_table_id");

    // 🟢 حالة عملية Transfer (نقل الطلب)
    if (transferPending) {
      const cartIds = JSON.parse(localStorage.getItem("transfer_cart_ids") || "[]");

      if (cartIds.length > 0 && sourceTableId === table.id.toString()) {
        toast.error(t("CannotTransferToSameTable"));
        return;
      }

      const formData = new FormData();
      formData.append("table_id", table.id);
      cartIds.forEach((id, i) => formData.append(`cart_ids[${i}]`, id));

      try {
        await postData(`cashier/transfer_order?locale=${locale}`, formData);
        toast.success(t("OrderTransferredSuccessfully"));

        // ✅ التعديل الأساسي: تحديث بيانات الطاولة الجديدة فوراً لضمان ظهورها في الواجهة
        localStorage.setItem("table_id", table.id);
        localStorage.setItem("table_number", table.table_number); // تحديث رقم الطاولة (مثل M-4)

        // تحديث اسم الصالة إذا كان متاحاً
        const hallName = table.location_name || selectedLocation?.name || "";
        if (hallName) {
          localStorage.setItem("hall_name", hallName);
        }

        // ✅ مسح بيانات التحويل المؤقتة
        [
          "transfer_cart_ids",
          "transfer_first_cart_id",
          "transfer_source_table_id",
          "transfer_pending",
        ].forEach((k) => localStorage.removeItem(k));

        // ✅ الانتقال مع تمرير البيانات في الـ state كدعم إضافي
        navigate("/order-page", {
          state: {
            order_type: "dine_in",
            table_id: table.id,
            table_number: table.table_number,
            transferred: true,
          },
        });

        // إجبار المتصفح على التحديث لضمان قراءة المكونات الأخرى للقيم الجديدة من الـ storage
        window.location.reload();

      } catch (err) {
        toast.error(err.response?.data?.message || t("FailedtotransfertablePleasetryagain"));
      }
    } else {
      // 🟢 الحالة العادية (فتح طاولة جديدة)
      const prepStatus = localStorage.getItem("preparation_num_status");

      if (prepStatus === "1") {
        setPendingTableSelection(table);
        setShowPreparationModal(true);
      } else {
        proceedToOrderPage(table, null);
      }
    }
  };
  const MergedTableCard = ({ table, onStatusChange, handleSplit }) => {
    const transferPending =
      localStorage.getItem("transfer_pending") === "true";
    const isSource =
      transferPending &&
      localStorage.getItem("transfer_source_table_id") ===
      table.id.toString();
    return (
      <div
        className={`
          relative p-3 rounded-lg border-2 shadow-sm transition-all cursor-pointer
          bg-gradient-to-br from-purple-50 to-purple-100
          ${selectedTable === table.id ? "ring-2 ring-purple-500" : ""}
          hover:shadow-md
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        <div className="absolute -top-2 left-2 bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
          <Link size={10} />
          <span className="font-bold">{t("MergedTable")}</span>
        </div>
        <div className="text-center mb-2">
          <div className="text-lg font-bold text-purple-800">
            {table.table_number}
          </div>
          <div className="text-xs flex flex-col items-center justify-center gap-1">
            <div className="flex items-center gap-1"><Users size={10} /> {table.capacity}</div>
            {/* عرض التوقيت للطاولة المدمجة الأساسية إذا وجد */}
            {table.current_status !== "available" && <LiveTimer startTime={table.start_timer} />}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1 text-xs mb-2">
          {table.subTables.map((sub) => (
            <div
              key={sub.id}
              className={`p-1.5 rounded border text-center ${getTableColor(
                sub.current_status || table.current_status
              )}`}
            >
              <div className="font-bold">{sub.table_number}</div>
              <div className="flex items-center justify-center gap-0.5">
                <Users size={8} /> {sub.capacity}
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (handleSplit) {
                    handleSplit(sub.id);
                  }
                }}
                className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors shadow-sm"
                title={t("SplitTable")}
              >
                <Scissors size={12} />
              </button>

            </div>
          ))}
        </div>

        <CustomStatusSelect
          table={table}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
        />
        {isSource && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-[9px] px-1.5 py-0.5 rounded">
            {t("Source")}
          </div>
        )}
        {transferPending && !isSource && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-[9px] px-1.5 py-0.5 rounded">
            Select
          </div>
        )}
      </div>
    );
  };
  const TableCard = ({ table, handleSplit }) => {
    const transferPending =
      localStorage.getItem("transfer_pending") === "true";
    const isSource =
      transferPending &&
      localStorage.getItem("transfer_source_table_id") ===
      table.id.toString();
    const { putData: putStatusChange } = usePut();
    const dynamicStatusOptions = statusOptions.filter((opt) =>
      opt.value === "reserved"
        ? ["available", "reserved"].includes(table.current_status)
        : true
    );
    const isSelectedForMerge = selectedTablesList.includes(table.id);
    const handleStatusChange = async (status) => {
      try {
        await putStatusChange(
          `cashier/tables_status/${table.id}?current_status=${status}`,
          {}
        );
        toast.success(t("StatusUpdated"));
      } catch (err) {

        toast.error(err.response?.data?.errors || "Failed");
        console.log(err.response?.data?.errors)
      }
    };
    if (table.isMerged) {
      return (
        <MergedTableCard table={table} onStatusChange={handleStatusChange} handleSplit={handleSplit} />
      );
    }
    return (
      <div
        className={`
          relative p-4 rounded-lg border-2 shadow-sm transition-all cursor-pointer text-center
          ${getTableColor(table.current_status)}
          ${table.current_status === "available" ? "border-dashed" : ""}
          ${selectedTable === table.id ? "ring-2 ring-blue-500" : ""}
          ${isSource ? "ring-2 ring-yellow-500 opacity-70" : ""}
          ${transferPending && !isSource ? "ring-2 ring-green-400" : ""}
          hover:shadow-md
          ${transferLoading ? "opacity-50 pointer-events-none" : ""}
          ${isSelectedForMerge ? "ring-4 ring-purple-600 scale-95" : ""}
        `}
        onClick={() => !transferLoading && handleSelectTable(table)}
      >
        <div className="text-2xl font-bold mb-1">{table.table_number}</div>
        <div className="flex flex-col items-center justify-center gap-1 text-sm mb-2">
          <div className="flex items-center gap-1">
            <Users size={14} />
            <span>{table.capacity}</span>
          </div>

          {/* عرض العداد إذا كانت الطاولة غير متاحة (بها زبائن) */}
          {table.current_status !== "available" && table.start_timer && (
            <LiveTimer startTime={table.start_timer} />
          )}
        </div>
        <div className="absolute top-1 right-1 flex gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSplit(sub.id); // استدعاء دالة الفصل
            }}
            className="bg-red-500 text-white p-1 rounded hover:bg-red-600 transition-colors"
            title={t("SplitTable")}
          >
            <Scissors size={12} />
          </button>
        </div>
        <CustomStatusSelect
          table={table}
          statusOptions={dynamicStatusOptions}
          onStatusChange={handleStatusChange}
        />
        {isSource && (
          <div className="absolute top-1 right-1 bg-yellow-500 text-white text-xs px-1.5 py-0.5 rounded">
            {t("Source")}
          </div>
        )}
        {transferPending && !isSource && (
          <div className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded">
            Select
          </div>
        )}
      </div>
    );
  };
  if (isLoading || transferLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
        {transferLoading && (
          <div className="absolute bottom-10 bg-white p-3 rounded shadow">
            <p className="text-sm">{t("Transferringorder")}</p>
          </div>
        )}
      </div>
    );
  }
  if (error) {
    return (
      <div
        className={`p-8 text-center text-red-600 bg-red-50 rounded-lg shadow-md max-w-lg mx-auto mt-10 ${isArabic ? "text-right" : "text-left"
          }`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <p className="font-semibold">{t("Failedtoloadtables")}</p>
        <p className="text-sm mt-2">
          {t("Pleasecheckyournetworkconnectionortryagainlater")}
        </p>
      </div>
    );
  }
  const LiveTimer = ({ startTime }) => {
    const [elapsed, setElapsed] = useState("");

    useEffect(() => {
      if (!startTime) return;

      const calculateTime = () => {
        const start = new Date(startTime.replace(/-/g, "/")); // لضمان التوافق مع كل المتصفحات
        const now = new Date();
        const diffInMs = Math.abs(now - start);

        const hours = Math.floor(diffInMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffInMs % (1000 * 60)) / 1000);

        // تنسيق العرض: 01:25:05
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setElapsed(display);
      };

      calculateTime(); // حساب فوري عند التحميل
      const timer = setInterval(calculateTime, 1000); // تحديث كل ثانية

      return () => clearInterval(timer);
    }, [startTime]);

    return startTime ? (
      <div className="flex items-center justify-center gap-1 text-[10px] font-mono bg-black/10 rounded px-1 mt-1 text-gray-700">
        <Clock size={10} />
        <span>{elapsed}</span>
      </div>
    ) : null;
  };
  return (
    <div className="w-full bg-gray-50 p-4" dir={isArabic ? "rtl" : "ltr"}>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        style={{ zIndex: 999999 }}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
      {/* 🟢 Preparation Number Modal */}
      <PreparationNumberModal
        isOpen={showPreparationModal}
        onClose={handleCancelPreparationModal}

        onSubmit={handleSubmitPreparationNumber}
        loading={preparationLoading}
        tableName={pendingTableSelection?.table_number || ""}
      />
      <div className="mx-auto bg-white rounded-xl shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-800">
            {localStorage.getItem("transfer_pending") === "true" || localStorage.getItem("transfer_takeaway_to_dine_in") === "true"
              ? t("SelectTableForTransfer")
              : t("DineInTables")}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {localStorage.getItem("transfer_takeaway_to_dine_in") === "true"
              ? t("SelectTableToTransferTakeawayOrder")
              : localStorage.getItem("transfer_pending") === "true"
                ? t("SelectTableToTransferFrom", {
                  sourceTableId: localStorage.getItem(
                    "transfer_source_table_id"
                  ),
                })
                : t("SelectTableToStartOrder")}
          </p>
        </div>
        <TableManagementActions
          selectedTables={selectedTablesList}
          setSelectedTables={setSelectedTablesList}
          isSelectionMode={isSelectionMode}
          setIsSelectionMode={setIsSelectionMode}
          onSuccess={refetch}
          setSplitHandler={setHandleSplitFromActions}
        />
        {locations.length > 0 ? (
          <Tabs
            value={selectedLocationId?.toString()}
            onValueChange={(v) => setSelectedLocationId(parseInt(v))}
            className="w-full"
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-1 p-4 pt-2 h-12 !shadow-none !bg-none w-full">
              {locations.map((loc) => (
                <TabsTrigger
                  key={loc.id}
                  value={loc.id.toString()}
                  className="text-xs data-[state=active]:bg-bg-primary data-[state=active]:text-white rounded-md"
                >
                  {t(loc.name) || loc.name}
                </TabsTrigger>
              ))}
            </TabsList>
            {locations.map((loc) => (
              <TabsContent
                key={loc.id}
                value={loc.id.toString()}
                className="mt-0"
              >
                <div className="p-4">
                  {tablesToDisplay.length > 0 ? (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-3 auto-rows-min">
                      {tablesToDisplay.map((table) => (
                        <TableCard key={table.id} table={table} handleSplit={handleSplitFromActions} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-lg">{t("NoTablesFound")}</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-10 text-center text-gray-600">
            <p className="font-semibold">{t("NoCafeLocationsFound")}</p>
          </div>
        )}
      </div>

    </div>
  );

};
export default Dine;