import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useShift } from "@/context/ShiftContext";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { CheckCircle, XCircle, User, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

export default function Shift() {
  const [shiftStatus, setShiftStatus] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const { openShift, closeShift, isShiftOpen } = useShift();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const [amount, setAmount] = useState("");
  const [showAmountInput, setShowAmountInput] = useState(false);
  const [selectedFinancialId, setSelectedFinancialId] = useState("");
  const [financialAccounts, setFinancialAccounts] = useState([]);
  // 🧠 استرجاع بيانات المستخدم
  const userData = localStorage.getItem("user");
  const user = userData && userData !== "undefined" ? JSON.parse(userData) : null;
  const userName = user?.user_name || "Cashier";
  const cashierId = localStorage.getItem("cashier_id");

// أضف هذا الـ useEffect أو عدل الموجود
useEffect(() => {
  if (!isShiftOpen) {
    setShowAmountInput(true);
    const data = JSON.parse(localStorage.getItem("financial_account") || "[]");
    setFinancialAccounts(data);
    if (data.length > 0 && !selectedFinancialId) {
      setSelectedFinancialId(data[0].id);
    }
  }
}, [isShiftOpen]);

  // ✅ دالة لتحديد الـ default tab بناءً على الـ permissions
  const setDefaultTabBasedOnPermissions = () => {
    if (!user) return;

    const permissions = {
      online_order: user.online_order === 1 || user.online_order === "1",
      delivery: user.delivery === 1 || user.delivery === "1",
      dine_in: user.dine_in === 1 || user.dine_in === "1",
      take_away: user.take_away === 1 || user.take_away === "1",
    };

    // الأولوية الجديدة: take_away أولاً → لو عنده كله هيفتح take_away
    let defaultTab = "take_away"; // fallback عام

    if (permissions.take_away) {
      defaultTab = "take_away";
    } else if (permissions.dine_in) {
      defaultTab = "dine_in";
    } else if (permissions.delivery) {
      defaultTab = "delivery";
    } else if (permissions.online_order) {
      defaultTab = "online-order";
    }

    localStorage.setItem("tab", defaultTab);

    // التعديل: إزالة الـ replace لتبقى الشرطة السفلية كما هي
    const orderTypeValue = defaultTab === "online-order" ? "online-order" : defaultTab;

    localStorage.setItem("order_type", orderTypeValue);

    if (!permissions.dine_in) {
      localStorage.removeItem("last_selected_group");
    }
  };

  // ✅ فتح الشيفت (POST)
  const handleOpenShift = async () => {
    const financialData = JSON.parse(localStorage.getItem("financial_account") || "[]");
    if (!amount) {
      setShowAmountInput(true);
      return;
    }
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/open`;

    try {
      setLoading(true);

      const payload = {
        cashier_id: cashierId,
        amount: amount,
        financial_id: selectedFinancialId
      };
      if (cashierId) payload.cashier_id = cashierId;


      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.post(endpoint, payload, { headers });

      openShift();
      setShiftStatus("Shift is open.");

      // 🟢 تحديد الـ tab الافتراضي بناءً على permissions بعد فتح الشيفت
      setDefaultTabBasedOnPermissions();
      setShowAmountInput(false);

      // تنظيف الـ URL من ?action
      const params = new URLSearchParams(location.search);
      params.delete("action");
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });

      // بدء العد التنازلي للتحويل إلى الصفحة الرئيسية
      let timeLeft = 3;
      setCountdown(timeLeft);
      const countdownInterval = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(countdownInterval);
          navigate("/"); // هيفتح على الـ tab اللي حددناه فوق
        }
      }, 1000);
    } catch (err) {
      console.error("Open shift error:", err);
      toast.error(err?.response?.data?.errors || t("FailedToOpenShift"));

    } finally {
      setLoading(false);
    }
  };

  // ✅ غلق الشيفت (GET)
  const handleCloseShiftAction = async () => {
    const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/close`;

    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await axios.get(endpoint, { headers });

      closeShift();

      localStorage.removeItem("shift_start_time");
      localStorage.removeItem("shift_data");

      setShiftStatus("Shift is closed.");
      toast.success(t("ShiftClosedSuccessfully"));

      setTimeout(() => {
        navigate("/", { replace: true });
      }, 1500);

    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    } finally {
      setLoading(false);
    }
  };

  // ✅ تنفيذ الغلق التلقائي في حالة action=close
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get("action");
    if (action === "close" && isShiftOpen) {
      handleCloseShiftAction();
    }
  }, [location.search, isShiftOpen]);

  // 🟢 لو الشيفت مفتوح بالفعل (يعني دخل الصفحة دي وهو شيفت مفتوح)، نحدد الـ tab كمان
  useEffect(() => {
    if (isShiftOpen) {
      setDefaultTabBasedOnPermissions();
    }
  }, [isShiftOpen]);

  if (loading) return <Loading />;

  // Framer Motion variants (مش متغيرة)
  const cardVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring" } },
  };
  const buttonVariants = {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1, transition: { duration: 0.5 } },
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <ToastContainer />

      <div className="max-w-md w-full m-auto pb-20">
        <div className="text-center mb-6">
          <h1 className="text-2xl text-gray-800">
            {t("WelcomeBack")}, <span className="text-bg-primary font-semibold">{userName}</span>
          </h1>
        </div>

        <motion.div
          className="bg-white rounded-xl shadow-lg overflow-hidden"
          variants={cardVariants}
          initial="hidden"
          animate="visible"
        >
          <div className="p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-800 mb-2">{t("ShiftStatus")}</h2>
            <p className="text-gray-500 text-sm">
              {isShiftOpen ? t("CurrentlyOnShift") : t("UpForShift")}
            </p>
          </div>

          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 bg-black rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-white" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {!isShiftOpen && !shiftStatus && (
              <motion.div
                key="open-initial"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                {showAmountInput && !isShiftOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="px-6 mb-4 space-y-4"
                  >
                    {/* حقل اختيار الحساب المالي */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                        {t("Select Financial Account")}
                      </label>
                      <select
                        value={selectedFinancialId}
                        onChange={(e) => setSelectedFinancialId(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary outline-none bg-white"
                      >
                        {financialAccounts.map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name} - {acc.details}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* حقل إدخال المبلغ */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2 text-right">
                        {t("EnterStartingAmount")}
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-bg-primary outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </motion.div>
                )}
                <motion.button
                  onClick={handleOpenShift}
                  // إضافة خاصية disabled: الزرار يتوقف لو المبلغ فارغ أو لم يتم اختيار حساب
                  disabled={!amount || !selectedFinancialId || loading}
                  className={`w-full font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group transition-all duration-200 
    ${(!amount || !selectedFinancialId || loading)
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-bg-primary hover:bg-red-800 text-white"}`}
                  whileHover={(!amount || !selectedFinancialId || loading) ? {} : { scale: 1.02 }}
                  whileTap={(!amount || !selectedFinancialId || loading) ? {} : { scale: 0.98 }}
                >
                  <span>{loading ? t("Loading...") : t("TakeYourShift")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {isShiftOpen && (
              <motion.div
                key="back-to-work"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  onClick={() => navigate("/")}
                  className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{t("BackToWork")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {/* باقي الـ AnimatePresence زي ما هو */}
            {shiftStatus && (
              <motion.div
                key="status-display"
                className="px-6 pb-4 text-center"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <div
                  className={`flex items-center justify-center gap-2 text-lg font-medium ${shiftStatus.includes("open") ? "text-green-600" : "text-bg-primary"
                    }`}
                >
                  {shiftStatus.includes("open") ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <XCircle className="w-6 h-6" />
                  )}
                  {shiftStatus}
                </div>
              </motion.div>
            )}

            {!isShiftOpen && shiftStatus === "Shift is closed." && (
              <motion.div
                key="open-new"
                className="px-6 pb-6"
                variants={buttonVariants}
                initial="initial"
                animate="animate"
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.button
                  onClick={handleOpenShift}
                  className="w-full bg-bg-primary hover:bg-red-800 text-white font-medium py-4 px-6 rounded-lg flex items-center justify-center gap-3 group"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{t("OpenNewShift")}</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-200" />
                </motion.button>
              </motion.div>
            )}

            {countdown !== null && countdown > 0 && shiftStatus?.includes("open") && (
              <motion.div
                key="countdown"
                className="px-6 pb-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <motion.div
                  className="text-4xl font-bold text-bg-primary"
                  key={countdown}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  {countdown}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}