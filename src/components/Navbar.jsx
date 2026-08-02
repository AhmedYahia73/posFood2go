// Navbar.jsx - النسخة الكاملة المعدلة مع Dropdown للإشعارات تحت الجرس (بدون إزالة أو اختصار أي شيء)
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { usePost } from "@/Hooks/usePost";
import { useGet } from "@/Hooks/useGet";
import { useShift } from "@/context/ShiftContext";
import { toast } from "react-toastify";
import { useIsMobile } from "@/Hooks/use-mobile";
import {
  FaBell,
  FaChevronDown,
  FaUtensils,
  FaMotorcycle,
  FaShoppingBag,
  FaGlobe,
  FaMoneyBillWave,
  FaEllipsisH,
  FaHistory,
  FaExclamationCircle,
  FaBars,
  FaTimes,
} from "react-icons/fa";
import { useTranslation } from "react-i18next";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import axios from "axios";
import logo from "@/assets/logo.jpg";
import {
  User,
  LogOut,
  Clock,
  Globe,
} from "lucide-react";

// المودالز
import ExpensesModal from "@/Pages/ExpensesModal";
import PasswordConfirmModal from "@/Pages/PasswordConfirmModal";
import EndShiftReportModal from "@/Pages/ReportsAfterShift";
import CartSwitchConfirmModal from "@/components/CartSwitchConfirmModal";

export default function Navbar() {
  const FALLBACK_SOUND = "https://www.soundjay.com/buttons/sounds/button-1.mp3";
  const navigate = useNavigate();
  const location = useLocation();
  const { postData } = usePost();
  const { isShiftOpen, shiftStartTime, closeShift } = useShift();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { t, i18n } = useTranslation();
  const [language, setLanguage] = useState(
    localStorage.getItem("language") || "en"
  );
  const [loading, setLoading] = useState(false);

  // حالات المودالز
  const [showExpensesModal, setShowExpensesModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showCashInputModal, setShowCashInputModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [cashAmount, setCashAmount] = useState("");
  const [pendingPassword, setPendingPassword] = useState("");
  const [endShiftReport, setEndShiftReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const audioRef = useRef(null);
  const previousCountRef = useRef(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showCartConfirmModal, setShowCartConfirmModal] = useState(false);
  const [pendingTabValue, setPendingTabValue] = useState(null);

  const isMobile = useIsMobile();
  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const permissions = {
    online_order: userData.online_order === 1,
    take_away: userData.take_away === 1,
    delivery: userData.delivery === 1,
    dine_in: userData.dine_in === 1,
  };

  const currentTab = localStorage.getItem("tab") || "take_away";
  const isArabic = i18n.language === "ar";
  useEffect(() => {
    const storedSound = localStorage.getItem("notification_sound") || FALLBACK_SOUND;
    audioRef.current = new Audio(storedSound);
    audioRef.current.load();

    const enableAudio = () => {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => { });
      window.removeEventListener('click', enableAudio);
    };
    window.addEventListener('click', enableAudio);
  }, []);

  const { data: notificationsData, refetch: refetchNotifications } = useGet(
    "cashier/orders/notifications",
    { useCache: false }
  );

  const notifications = notificationsData?.orders || [];

  useEffect(() => {
    if (notificationsData?.orders_count !== undefined) {
      const newCount = notificationsData.orders_count;

      if (newCount > previousCountRef.current) {
        if (audioRef.current) {
          const currentStoredSound = localStorage.getItem("notification_sound") || FALLBACK_SOUND;
          if (audioRef.current.src !== currentStoredSound) {
            audioRef.current.src = currentStoredSound;
          }

          audioRef.current.play().catch((e) => console.warn("Audio play blocked:", e));
          toast.info(t("NewOrderReceived"));
        }
      }

      setNotificationCount(newCount);
      previousCountRef.current = newCount;
    }
  }, [notificationsData, t]);

  useEffect(() => {
    if (!permissions.online_order) return;
    const interval = setInterval(() => {
      refetchNotifications();
    }, 15000);
    return () => clearInterval(interval);
  }, [refetchNotifications, permissions.online_order]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isShiftOpen) {
      const timer = setInterval(() => setCurrentTime(new Date()), 1000);
      return () => clearInterval(timer);
    }
  }, [isShiftOpen]);

  const toggleLanguage = () => {
    const newLang = language === "en" ? "ar" : "en";
    i18n.changeLanguage(newLang);
    setLanguage(newLang);
    localStorage.setItem("language", newLang);
    document.documentElement.dir = newLang === "ar" ? "rtl" : "ltr";
  };

  const formatElapsedTime = () => {
    const start = shiftStartTime || localStorage.getItem("shift_start_time");
    if (!start) return "00:00:00";
    const elapsed = Math.floor((currentTime - new Date(start)) / 1000);
    const hours = Math.floor(elapsed / 3600);
    const minutes = Math.floor((elapsed % 3600) / 60);
    const seconds = elapsed % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleTabChange = (value) => {
    const activeTab = localStorage.getItem("tab") || "take_away";
    console.log("Navigating to:", value, "Current tab:", activeTab);

    if (!permissions[value.replace("-", "_")]) {
      console.log("Permission denied for:", value);
      toast.warn(t("You do not have permission for this section"));
      return;
    }

    if (value === activeTab) {
      console.log("Already on this tab, doing nothing.");
      return;
    }

    const cartString = localStorage.getItem("cart");
    console.log("Cart string from localStorage:", cartString);
    const cart = cartString && cartString !== "undefined" ? JSON.parse(cartString) : [];
    console.log("Parsed cart count:", cart.length);

    if (cart.length > 0) {
      console.log("Cart not empty, showing confirmation modal...");
      setPendingTabValue(value);
      setShowCartConfirmModal(true);
    } else {
      console.log("Cart empty, proceeding with normal switch.");
      proceedWithTabChange(value);
    }
  };

  const proceedWithTabChange = (value, action = "clear") => {
    const isRepeated = localStorage.getItem("is_repeating_order") === "true";
    const currentTabStored = localStorage.getItem("tab") || "take_away";

    if (action === "keep") {
      // Save current cart to its specific module key
      const cartString = localStorage.getItem("cart");
      console.log(`💾 Saving items to cart_${currentTabStored}:`, cartString);
      if (cartString) {
        localStorage.setItem(`cart_${currentTabStored}`, cartString);
      }
    } else {
      // Clear current module's specific cart if clearing
      console.log(`🗑️ Clearing saved items for cart_${currentTabStored}`);
      localStorage.removeItem(`cart_${currentTabStored}`);
    }

    // Always start with an empty cart for the new module 
    // unless we load a saved one later
    if (!isRepeated) {
      console.log("🧹 Clearing main cart for new module transition");
      localStorage.removeItem("cart");
    }

    // Load target module's cart if it exists
    const targetCart = localStorage.getItem(`cart_${value}`);
    if (targetCart && targetCart !== "undefined") {
      console.log(`📦 Loading saved items from cart_${value} into main cart`);
      localStorage.setItem("cart", targetCart);
    }

    localStorage.setItem("tab", value);
    localStorage.setItem("order_type", value);

    if (isRepeated) {
      localStorage.removeItem("is_repeating_order");
    }

    if (value === "take_away") {
      localStorage.removeItem("table_id");
      localStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "dine_in") {
      localStorage.removeItem("delivery_user_id");
      navigate("/", { replace: true });
    } else if (value === "delivery") {
      localStorage.removeItem("table_id");
      navigate("/", { replace: true });
    } else if (value === "online-order") {
      navigate("/online-orders", { replace: true });
    }

    setShowCartConfirmModal(false);
    setPendingTabValue(null);
  };

  const onClearAndSwitch = () => {
    proceedWithTabChange(pendingTabValue, "clear");
  };

  const onKeepAndSwitch = () => {
    proceedWithTabChange(pendingTabValue, "keep");
  };

  const handleTables = () => {
    if (!permissions.dine_in) {
      toast.warn(t("You do not have permission for tables"));
      return;
    }
    navigate("/tables", { replace: true });
  };

  const handleDueUsers = () => navigate("/due");
  const handleAllOrders = () => navigate("/all-orders");
  const handleExpenses = () => setShowExpensesModal(true);
  const handleExpensesList = () => navigate("/expenses");
  const handleDeliveryOrder = () => navigate("/deliveryOrders");
  const handleDineInOrder = () => navigate("/dine-in-orders");


  const handleCloseShift = () => {
    if (!isShiftOpen) {
      toast.error(t("No active shift found"));
      return;
    }
    setShowPasswordModal(true);
  };

  const handleAutoCashConfirmed = async (password) => {
    setReportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const response = await axios.post(
        `${baseUrl}cashier/reports/end_shift_report`,
        {
          password: password,
          amount: 0,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEndShiftReport(response.data);
      setShowReportModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handlePasswordConfirmed = (password) => {
    setPendingPassword(password);
    setShowPasswordModal(false);
    const enterAmountStatus = localStorage.getItem("enter_amount");

    if (enterAmountStatus === "1") {
      setShowCashInputModal(true);
      setCashAmount("");
    } else {
      handleAutoCashConfirmed(password);
    }
  };

  const handleCashConfirmed = async () => {
    if (!cashAmount || isNaN(cashAmount) || Number(cashAmount) < 0) {
      toast.error("Please enter a valid cash amount");
      return;
    }

    setReportLoading(true);
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      const response = await axios.post(
        `${baseUrl}cashier/reports/end_shift_report`,
        {
          password: pendingPassword,
          amount: Number(cashAmount),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setEndShiftReport(response.data);
      setShowCashInputModal(false);
      setShowReportModal(true);
    } catch (err) {
      const msg = err.response?.data?.message || t("Invalid password or error occurred");
      toast.error(msg);
    } finally {
      setReportLoading(false);
    }
  };

  const handleFinalClose = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const endpoint = `${import.meta.env.VITE_API_BASE_URL}cashier/shift/close`;

      // 1. قفل الشيفت أولاً
      await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      // 2. نداء الـ Logout API (وهو لسه معاه الـ Token في الميموري أو الـ Storage)
      try {
        await postData("api/logout", {});
      } catch (logoutErr) {
        console.error("Logout API failed, but shift was closed", logoutErr);
      }

      // 3. تنفيذ الـ Logic الداخلي للموقع
      closeShift(); // لو دي Function بتغير State في الـ Context

      // 4. تنظيف الـ Storage (خلينا في الـ removeItem لو محتاجة تحفظي اللغة)
      localStorage.removeItem("shift_start_time");
      localStorage.removeItem("shift_data");
      localStorage.removeItem("token");
      // localStorage.clear(); // استخدميها لو عايزة تمسحي "كله" فعلاً

      toast.success(t("ShiftClosedSuccessfully"));

      // 5. التوجيه
      navigate("/login");
    } catch (err) {
      console.error("Close shift error:", err);
      toast.error(err?.response?.data?.message || t("FailedToCloseShift"));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await postData("api/logout", {});
      const keepKeys = ['language', 'notification_sound', 'shiftStatus', 'shiftStartTime', 'receipt_design', 'cashier_id'];
      Object.keys(localStorage).forEach(key => {
        if (!keepKeys.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      toast.success(t("Logged out successfully"));
      navigate("/login");
    } catch (err) {
      toast.error(err?.message || t("Error while logging out"));
    }
  };

  const handleOrderClick = async (orderId) => {
    try {
      const token = localStorage.getItem("token");
      const baseUrl = import.meta.env.VITE_API_BASE_URL;

      await axios.get(`${baseUrl}cashier/orders/order_read/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      refetchNotifications();
      navigate(`/online-orders/${orderId}`);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Error marking order as read:", err);
      toast.error("فشل في تحديث حالة الطلب");
      navigate(`/online-orders/${orderId}`);
      setIsDropdownOpen(false);
    }
  };

  return (
    <>
      <div className="text-gray-800 px-4 w-full z-9 bg-white shadow-md relative min-h-[70px] md:min-h-[96px] flex items-center">
        <div className="flex items-center justify-between w-full h-full py-1.5 gap-2 md:gap-4">
          {/* Left Section: Navigation */}
          <div className="flex items-center gap-2 flex-1 pb-1">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <button
                  onClick={() => navigate(-1)}
                  className="w-10 h-10 md:w-12 md:h-12 flex items-center justify-center font-bold text-center hover:bg-bg-primary hover:text-white cursor-pointer rounded-lg md:rounded-xl bg-gray-50 text-gray-400 border border-gray-100 transition-all duration-300 shadow-sm shrink-0"
                  title="Go back"
                >
                  <span className="text-2xl md:text-3xl">←</span>
                </button>
              )}

            {/* Hamburger for mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden w-10 h-10 flex flex-col items-center justify-center text-gray-500 hover:text-bg-primary rounded-lg ml-1"
            >
              <FaBars className="text-2xl" />
            </button>

            {/* Desktop Navbar Buttons */}
            <div className="hidden md:flex items-center gap-3 overflow-x-auto no-scrollbar py-3 px-1">
              {/* Core Square Buttons */}
              {permissions.take_away && (
                <button
                  onClick={() => handleTabChange("take_away")}
                  className={`relative flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 overflow-hidden ${currentTab === "take_away"
                    ? "bg-gradient-to-br from-bg-primary to-[#800000] text-white border-bg-primary shadow-xl scale-105"
                    : "bg-white text-gray-500 border-gray-100 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm"
                    }`}
                >
                  <FaShoppingBag className={`${currentTab === "take_away" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} mb-1 transition-all duration-300`} />
                  <span className={`text-[9px] md:text-[11px] font-extrabold tracking-tight ${currentTab === "take_away" ? "text-white" : "text-gray-600"}`}>{t("take_away")}</span>
                  {currentTab === "take_away" && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                </button>
              )}

              {permissions.delivery && (
                <button
                  onClick={() => handleTabChange("delivery")}
                  className={`relative flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 overflow-hidden ${currentTab === "delivery"
                    ? "bg-gradient-to-br from-bg-primary to-[#800000] text-white border-bg-primary shadow-xl scale-105"
                    : "bg-white text-gray-500 border-gray-100 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm"
                    }`}
                >
                  <FaMotorcycle className={`${currentTab === "delivery" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} mb-1 transition-all duration-300`} />
                  <span className={`text-[9px] md:text-[11px] font-extrabold tracking-tight ${currentTab === "delivery" ? "text-white" : "text-gray-600"}`}>{t("Delivery")}</span>
                  {currentTab === "delivery" && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                </button>
              )}

              {permissions.dine_in && (
                <button
                  onClick={() => handleTabChange("dine_in")}
                  className={`relative flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 overflow-hidden ${currentTab === "dine_in"
                    ? "bg-gradient-to-br from-bg-primary to-[#800000] text-white border-bg-primary shadow-xl scale-105"
                    : "bg-white text-gray-500 border-gray-100 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm"
                    }`}
                >
                  <FaUtensils className={`${currentTab === "dine_in" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} mb-1 transition-all duration-300`} />
                  <span className={`text-[9px] md:text-[11px] font-extrabold tracking-tight ${currentTab === "dine_in" ? "text-white" : "text-gray-600"}`}>{t("Dinein")}</span>
                  {currentTab === "dine_in" && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                </button>
              )}

              {permissions.online_order && (
                <button
                  onClick={() => handleTabChange("online-order")}
                  className={`relative flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 overflow-hidden ${currentTab === "online-order"
                    ? "bg-gradient-to-br from-bg-primary to-[#800000] text-white border-bg-primary shadow-xl scale-105"
                    : "bg-white text-gray-500 border-gray-100 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm"
                    }`}
                >
                  <FaGlobe className={`${currentTab === "online-order" ? "text-2xl md:text-3xl" : "text-xl md:text-2xl"} mb-1 transition-all duration-300`} />
                  <span className={`text-[9px] md:text-[11px] font-extrabold tracking-tight ${currentTab === "online-order" ? "text-white" : "text-gray-600"}`}>{t("OnlineOrders")}</span>
                  {currentTab === "online-order" && <div className="absolute inset-0 bg-white/10 pointer-events-none" />}
                </button>
              )}

              <button
                onClick={handleExpenses}
                className="group flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 bg-white text-green-600 border-green-50 hover:border-green-600 hover:bg-green-50 shadow-sm"
              >
                <FaMoneyBillWave className="text-2xl md:text-3xl mb-1 group-hover:scale-110 transition-transform" />
                <span className="text-[9px] md:text-[11px] font-extrabold tracking-tight text-green-700">{t("Expenses")}</span>
              </button>

              {/* More Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl transition-all duration-300 border-2 bg-white text-gray-400 border-gray-100 outline-none shadow-sm hover:bg-bg-primary hover:text-white hover:border-bg-primary group">

                    <FaEllipsisH className="text-2xl md:text-3xl mb-1 group-hover:text-white transition-colors" />

                    <span className="text-[9px] md:text-[11px] font-extrabold tracking-tight text-gray-500 group-hover:text-white transition-colors">
                      {t("More")}
                    </span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="z-[9999] w-56 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.2)] border-gray-100 rounded-xl p-1"
                >
                  <DropdownMenuItem onClick={handleAllOrders} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-lg group">
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
                      <FaHistory size={14} />
                    </div>
                    <span className="font-bold text-gray-700">{t("AllOrders")}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem onClick={handleDueUsers} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-lg group">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <FaExclamationCircle size={14} />
                    </div>
                    <span className="font-bold text-gray-700">{t("Due")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExpensesList} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-lg group">
                    <div className="w-8 h-8 rounded-full bg-red-50 text-red-600 flex items-center justify-center group-hover:bg-red-600 group-hover:text-white transition-colors">
                      <FaExclamationCircle size={14} />
                    </div>
                    <span className="font-bold text-gray-700">{t("Expenses")}</span>
                  </DropdownMenuItem>

                  {permissions.dine_in && (
                    <DropdownMenuItem onClick={handleTables} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-lg group">
                      <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <FaUtensils size={14} />
                      </div>
                      <span className="font-bold text-gray-700">{t("Tables")}</span>
                    </DropdownMenuItem>
                  )}

                  {(permissions.delivery || permissions.dine_in) && (
                    <>
                      <DropdownMenuSeparator className="my-1 bg-gray-100" />
                      <DropdownMenuLabel className="px-3 py-2 text-[10px] uppercase tracking-wider text-gray-400 font-bold">{t("Reports")}</DropdownMenuLabel>
                      {permissions.delivery && (
                        <DropdownMenuItem onClick={handleDeliveryOrder} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-red-50 text-gray-600 hover:text-bg-primary rounded-lg font-semibold transition-colors">
                          {t("DeliveryOrder")}
                        </DropdownMenuItem>
                      )}
                      {permissions.dine_in && (
                        <DropdownMenuItem onClick={handleDineInOrder} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-red-50 text-gray-600 hover:text-bg-primary rounded-lg font-semibold transition-colors">
                          {t("DineInOrder")}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>


          <div className="static md:absolute md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 z-10 mx-auto md:mx-0 order-first md:order-none shrink-0">
            <a
              href="https://Food2go.online"
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <img
                src={logo}
                alt="Food2go Logo"
                className="h-8 md:h-14 w-auto object-contain hover:scale-110 transition-transform duration-300"
              />
            </a>
          </div>

          {/* Right Section: Actions */}
          <div className="flex items-center justify-end gap-3 flex-1 py-1">
            {location.pathname !== "/shift" &&
              location.pathname !== "/cashier" && (
                <div className="flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl bg-gray-50 border-2 border-gray-100 text-gray-700 shadow-sm">
                  <Clock className="w-5 h-5 md:w-6 md:h-6 mb-1 text-gray-400" />
                  <span className="text-[9px] md:text-[11px] font-extrabold text-bg-primary">
                    {formatElapsedTime()}
                  </span>
                </div>
              )}

            {/* Notifications Dropdown */}
            {permissions.online_order && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="relative flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl bg-white border-2 border-gray-100 text-gray-500 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm transition-all duration-300 outline-none"
                >
                  <FaBell className="text-2xl md:text-3xl mb-1 transition-all duration-300" />
                  <span className="text-[9px] md:text-[11px] font-extrabold text-gray-400 uppercase tracking-tighter">{t("New")}</span>
                  {notificationCount > 0 && (
                    <span className="absolute top-1 right-1 md:top-2 md:right-2 bg-red-500 text-white text-[8px] md:text-[10px] font-bold rounded-full px-1 md:px-1.5 min-w-[16px] h-[16px] md:min-w-[20px] md:h-[20px] flex items-center justify-center shadow-md animate-pulse">
                      {notificationCount > 99 ? "99+" : notificationCount}
                    </span>
                  )}
                  {isDropdownOpen && <div className="absolute inset-0 bg-bg-primary/5 pointer-events-none rounded-xl md:rounded-2xl" />}
                </button>

                {isDropdownOpen && (
                  <div className={`absolute ${isArabic ? "left-0" : "right-0"} mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[9999] max-h-96 overflow-y-auto`}>
                    <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl">
                      <h3 className="font-extrabold text-gray-800 text-lg">{t("NewOrders")} ({notificationCount})</h3>
                    </div>
                    <div className="py-2">
                      {notifications.length > 0 ? (
                        <ul>
                          {notifications.map((orderId) => (
                            <li key={orderId}>
                              <button onClick={() => handleOrderClick(orderId)} className="w-full px-5 py-4 hover:bg-gray-50 transition text-right flex items-center justify-between border-b border-gray-50 last:border-0 border-r-4 border-r-bg-primary">
                                <div>
                                  <span className="font-bold text-gray-800 text-base">Order #{orderId}</span>
                                  <span className="block text-sm text-gray-400 mt-0.5">{t("New Order")}</span>
                                </div>
                                <span className="text-xs font-bold bg-red-100 text-red-600 px-3 py-1 rounded-full">{t("New")}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="p-10 text-center">
                          <FaBell className="text-4xl text-gray-200 mx-auto mb-3" />
                          <p className="text-gray-400 font-bold">{t("Noneworders")}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
                      <button onClick={() => { handleTabChange("online-order"); setIsDropdownOpen(false); }} className="w-full text-center text-bg-primary font-extrabold hover:underline">{t("View All Orders")}</button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Account Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex flex-col items-center justify-center min-w-[60px] h-[60px] md:min-w-[76px] md:h-[76px] rounded-xl md:rounded-2xl bg-white border-2 border-gray-100 text-gray-500 hover:border-bg-primary/20 hover:bg-gray-50 shadow-sm transition-all duration-300 outline-none">
                  <User className="w-5 h-5 md:w-6 md:h-6 mb-1 text-gray-400" />
                  <span className="text-[9px] md:text-[11px] font-extrabold text-gray-400 uppercase tracking-tighter truncate max-w-[50px] md:max-w-[65px]">{userData.name || t("User")}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align={isArabic ? "start" : "end"} className="w-64 mt-3 bg-white shadow-2xl border-gray-100 rounded-2xl p-1">
                <DropdownMenuLabel className="font-extrabold text-gray-800 px-4 py-3">{userData.name || t("UserAccount")}</DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-xl font-bold text-gray-700">
                  <User className="w-5 h-5 text-gray-400" />
                  <span>{t("Profile")}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleLanguage} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 rounded-xl font-bold text-gray-700">
                  <Globe className="w-5 h-5 text-gray-400" />
                  <span>{isArabic ? "English" : "العربية"}</span>
                </DropdownMenuItem>
                {location.pathname !== "/shift" && location.pathname !== "/cashier" && isShiftOpen && (
                  <DropdownMenuItem onClick={handleCloseShift} disabled={loading || reportLoading} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-red-50 text-red-600 focus:text-red-600 rounded-xl font-bold">
                    <Clock className="w-5 h-5" />
                    <span>{t("closeshift")}</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator className="bg-gray-100" />
                <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-3 p-3 cursor-pointer hover:bg-red-600 hover:text-white focus:bg-red-600 focus:text-white rounded-xl font-bold text-red-800">
                  <LogOut className="w-5 h-5" />
                  <span>{t("logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div >
      </div >

      {/* Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[10000] flex">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)}></div>
          <div className={`relative bg-white w-[75vw] max-w-[300px] h-[100dvh] shadow-2xl flex flex-col animate-in ${isArabic ? "slide-in-from-right" : "slide-in-from-left"} duration-300 z-10`}>
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <span className="font-bold text-lg text-gray-800">{t("Menu")}</span>
              <button onClick={() => setIsMobileMenuOpen(false)} className="text-gray-500 hover:text-red-500 bg-gray-200 p-2 rounded-full">
                <FaTimes size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {permissions.take_away && (
                <button
                  onClick={() => { handleTabChange("take_away"); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${currentTab === "take_away" ? "bg-red-50 border-bg-primary text-bg-primary font-bold shadow-md" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                >
                  <FaShoppingBag className="text-2xl" />
                  <span className="text-sm font-bold">{t("take_away")}</span>
                </button>
              )}
              {permissions.delivery && (
                <button
                  onClick={() => { handleTabChange("delivery"); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${currentTab === "delivery" ? "bg-red-50 border-bg-primary text-bg-primary font-bold shadow-md" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                >
                  <FaMotorcycle className="text-2xl" />
                  <span className="text-sm font-bold">{t("Delivery")}</span>
                </button>
              )}
              {permissions.dine_in && (
                <button
                  onClick={() => { handleTabChange("dine_in"); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${currentTab === "dine_in" ? "bg-red-50 border-bg-primary text-bg-primary font-bold shadow-md" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                >
                  <FaUtensils className="text-2xl" />
                  <span className="text-sm font-bold">{t("Dinein")}</span>
                </button>
              )}
              {permissions.online_order && (
                <button
                  onClick={() => { handleTabChange("online-order"); setIsMobileMenuOpen(false); }}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 transition-all ${currentTab === "online-order" ? "bg-red-50 border-bg-primary text-bg-primary font-bold shadow-md" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}
                >
                  <FaGlobe className="text-2xl" />
                  <span className="text-sm font-bold">{t("OnlineOrders")}</span>
                </button>
              )}

              <div className="h-px bg-gray-200 my-2"></div>

              <button
                onClick={() => { handleExpenses(); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 text-green-700 hover:bg-green-50 transition-all font-bold"
              >
                <FaMoneyBillWave className="text-2xl" />
                <span className="text-sm">{t("Expenses")}</span>
              </button>

              <button
                onClick={() => { handleAllOrders(); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 text-gray-700 hover:bg-gray-50 transition-all font-bold"
              >
                <FaHistory className="text-2xl text-blue-600" />
                <span className="text-sm">{t("AllOrders")}</span>
              </button>

              <button
                onClick={() => { handleDueUsers(); setIsMobileMenuOpen(false); }}
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 text-gray-700 hover:bg-gray-50 transition-all font-bold"
              >
                <FaExclamationCircle className="text-2xl text-red-600" />
                <span className="text-sm">{t("Due")}</span>
              </button>

              {permissions.dine_in && (
                <button
                  onClick={() => { handleTables(); setIsMobileMenuOpen(false); }}
                  className="flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 text-gray-700 hover:bg-gray-50 transition-all font-bold"
                >
                  <FaUtensils className="text-2xl text-orange-600" />
                  <span className="text-sm">{t("Tables")}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showExpensesModal && (
        <ExpensesModal onClose={() => setShowExpensesModal(false)} />
      )}
      {
        showPasswordModal && (
          <PasswordConfirmModal
            onConfirm={handlePasswordConfirmed}
            onCancel={handleFinalClose}
            loading={reportLoading}
          />
        )
      }
      {
        showCashInputModal && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-md border border-gray-100">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800">{t("closeshift")}</h3>
                <p className="text-gray-500 mt-2">{t("CashInHandAmount")}</p>
              </div>
              <div className="relative">
                <input
                  type="number"
                  className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-bg-primary outline-none text-center text-3xl font-bold text-gray-700 transition-all"
                  placeholder="0.00"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  autoFocus
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">EGP</span>
              </div>
              <div className="flex gap-4 mt-8">
                <button
                  onClick={() => { setShowCashInputModal(false); setCashAmount(""); }}
                  className="flex-1 py-3 text-gray-600 font-semibold hover:bg-gray-100 rounded-xl transition"
                >
                  {t("Cancel")}
                </button>
                <button
                  onClick={handleCashConfirmed}
                  disabled={!cashAmount || reportLoading}
                  className="flex-1 py-3 bg-bg-primary text-white font-semibold rounded-xl shadow-lg hover:bg-red-700 transition disabled:opacity-50"
                >
                  {reportLoading ? t("Loading") : t("ConfirmAndSend")}
                </button>
              </div>
            </div>
          </div>
        )
      }
      {
        showReportModal && (
          <EndShiftReportModal
            reportData={endShiftReport}
            onClose={() => setShowReportModal(false)}
            onConfirmClose={handleFinalClose}
          />
        )
      }
      <CartSwitchConfirmModal
        open={showCartConfirmModal}
        onOpenChange={setShowCartConfirmModal}
        onClearAndSwitch={onClearAndSwitch}
        onKeepAndSwitch={onKeepAndSwitch}
        itemCount={(() => {
          const cartString = localStorage.getItem("cart");
          if (!cartString || cartString === "undefined") return 0;
          try {
            return JSON.parse(cartString).length;
          } catch {
            return 0;
          }
        })()}
      />
    </>
  );
}