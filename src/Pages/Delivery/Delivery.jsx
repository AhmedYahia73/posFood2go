import { getCurrencySymbol } from '../../utils/currency';
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Phone, MapPin, User, Pencil, Clock, ShoppingBag, X } from "lucide-react";
import { useGet } from "@/Hooks/useGet";
import { useLocation, useNavigate } from "react-router-dom";
import Loading from "@/components/Loading";
import { usePost } from "@/Hooks/usePost";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

export default function Delivery({ orderType: propOrderType }) {
  const [searchQuery, setSearchQuery] = useState("");
  const orderType = propOrderType || "delivery";
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [filteredusers, setFilteredusers] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  // 🟢 نجيب user_id من ال URL
  const queryParams = new URLSearchParams(location.search);
  const userIdFromUrl = queryParams.get("user_id");
  const [selecteduser, setSelecteduser] = useState(null);
  const [editData, setEditData] = useState({ name: "", phone: "" });
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // States for Last Orders Modal
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [userOrders, setUserOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [selectedOrderUserId, setSelectedOrderUserId] = useState(null);

  const { data, error, isLoading, refetch } = useGet("cashier/user", { useCache: true });
  const { postData, loading } = usePost();

  // في ملف Delivery.jsx

  useEffect(() => {
    if (data?.users) {

      // 1. شوف لو في بحث متسجل في الـ Session
      const savedQuery = localStorage.getItem("delivery_search_query");

      // 2. لو في بحث، طبق الفلتر على الداتا "الجديدة" فوراً
      if (savedQuery) {
        setSearchQuery(savedQuery);

        const lowerCaseQuery = savedQuery.toLowerCase();
        const filtered = data.users.filter((user) => {
          const fullName = `${user.f_name} ${user.l_name}`.toLowerCase();
          const matchesName = fullName.includes(lowerCaseQuery);
          const matchesPhone = user.phone && String(user.phone).includes(lowerCaseQuery);
          return matchesName || matchesPhone;
        });

        setFilteredusers(filtered); // اعرض المتفلتر بس
      } else {
        // 3. لو مفيش بحث، اعرض كله عادي
        setFilteredusers(data.users);
      }

      // --- باقي الكود زي ما هو ---

      // 🟢 معالجة الـ refetch
      const refetchParam = queryParams.get("refetch");
      if (refetchParam === "true") {
        refetch();
        navigate(location.pathname + location.search.replace(/[?&]refetch=true/, ''), { replace: true });
      }

      // كود السكرول (Scroll)
      const savedUserId = userIdFromUrl || localStorage.getItem("last_selected_user_id");
      if (savedUserId) {
        setTimeout(() => {
          const element = document.getElementById(`user-card-${savedUserId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
            element.classList.add("ring-2", "ring-bg-primary");
            setTimeout(() => element.classList.remove("ring-2", "ring-bg-primary"), 1500);
          }
        }, 500);
      }
    }
  }, [data, userIdFromUrl, location.search]);



  const handleInstantSearch = (query) => {
    setSearchQuery(query);

    // كل ما يتغير البحث → نحفظه في الـ localStorage
    localStorage.setItem("delivery_search_query", query);

    if (!data?.users) {
      setFilteredusers([]);
      return;
    }

    if (!query) {
      setFilteredusers(data.users);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const filtered = data.users.filter((user) => {
      const fullName = `${user.f_name} ${user.l_name}`.toLowerCase();
      const matchesName = fullName.includes(lowerCaseQuery);
      const matchesPhone =
        user.phone && String(user.phone).includes(lowerCaseQuery);
      return matchesName || matchesPhone;
    });
    setFilteredusers(filtered);
  };
  const handleAddUser = () => {
    navigate("/add");
  };

  const handleEditClick = (user) => {
    localStorage.setItem("last_selected_user_id", user.id); // 🟢 نحفظه
    setSelecteduser(user);
    setEditData({
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
    });
    setOpenDialog(true);
  };


  const handleSaveEdit = async () => {
    if (!selecteduser) return;
    if (isSubmitting || loading) return;

    setIsSubmitting(true);

    try {
      await postData(`cashier/user/update/${selecteduser.id}`, editData);
      setOpenDialog(false);
      await refetch(); // تحديث البيانات
      // 🟢 متشيليش last_selected_user_id هنا
    } catch (error) {
      console.error("Error updating user:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditAddressClick = (address) => {
    navigate(`order-page/add/${address.id}`);
  };

  const handleConfirmDelivery = (user, addressId) => {
    try {
      // هذا هو الـ API الذي طلبته
      const { data, isLoading, error } = useGet(
        `captain/lists?branch_id=${branch_id}&module=${orderType}`
      );

      console.log("Module switched to delivery successfully");
    } catch (err) {
      console.error("Error switching module:", err);
      // نكمل التنقل حتى لو فشل الـ API لضمان استمرارية العمل، أو يمكنك إيقافه حسب الرغبة
    }
    const selectedAddress = user.address.find((addr) => addr.id === addressId);

    localStorage.setItem("selected_user_id", user.id);
    localStorage.setItem("selected_address_id", addressId);
    localStorage.setItem("order_type", "delivery");

    const userData = {
      id: user.id,
      f_name: user.f_name,
      l_name: user.l_name,
      phone: user.phone,
      phone_2: user.phone_2,
      selectedAddress: selectedAddress,
    };
    localStorage.setItem("selected_user_data", JSON.stringify(userData));

    navigate("/", {
      state: { orderType: "delivery", userId: user.id, addressId: addressId },
      replace: true,
    });
  };


  // Function to fetch user's last orders
  const handleViewLastOrders = async (userId) => {
    setSelectedOrderUserId(userId);
    setShowOrdersModal(true);
    setLoadingOrders(true);
    setUserOrders([]);

    const formData = new FormData();
    formData.append("user_id", userId.toString());

    try {
      const response = await postData("cashier/view_user_order", formData);
      console.log("Orders Response:", response);

      if (response?.orders && Array.isArray(response.orders)) {
        setUserOrders(response.orders);
      } else {
        setUserOrders([]);
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
      setUserOrders([]);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Function to repeat an order (navigate to take_away with order data)
  const handleRepeatOrder = (order) => {
    console.log("🔄 Repeating order:", order);

    // Map order details to cart format
    const mappedItems = order.order_details.map((detail, index) => {
      const product = detail.product && detail.product[0];
      if (!product || !product.product) return null;

      const productData = product.product;
      const count = parseInt(product.count) || 1;
      const notes = product.notes || "";

      // Map addons
      const addons = detail.addons && Array.isArray(detail.addons)
        ? detail.addons.map((addon) => ({
          id: addon.addon_id || addon.id,
          name: addon.name || "Unknown Addon",
          price: parseFloat(addon.price || 0),
          originalPrice: parseFloat(addon.price || 0),
          count: parseInt(addon.count || 1),
          preparation_status: "pending",
        }))
        : [];

      return {
        id: productData.id,
        temp_id: `repeat_${productData.id}_${Date.now()}_${index}`,
        name: productData.name || "Unknown Product",
        price: parseFloat(productData.price || 0),
        originalPrice: parseFloat(productData.price || 0),
        count: count,
        notes: notes,
        selectedVariation: detail.variations && detail.variations[0] ? detail.variations[0].name : null,
        selectedExtras: detail.extras || [],
        selectedAddons: addons,
        selectedExcludes: detail.excludes || [],
        preparation_status: "pending",
        type: "main_item",
        addons: addons,
      };
    }).filter(Boolean);

    console.log("📦 Mapped Items for Cart:", mappedItems);

    // Clear any existing order data first
    localStorage.removeItem("selected_user_id");
    localStorage.removeItem("selected_address_id");
    localStorage.removeItem("order_type");
    localStorage.removeItem("table_id");
    localStorage.removeItem("delivery_user_id");
    localStorage.setItem("is_repeating_order", "true");
    // Set new order data
    localStorage.setItem("cart", JSON.stringify(mappedItems));
    localStorage.setItem("order_type", "delivery");
    localStorage.setItem("tab", "delivery");
    const userId = order.user_id || selectedOrderUserId;
    localStorage.setItem("selected_user_id", userId || "");

    // If order has address, save it too
    if (order.address_id) {
      localStorage.setItem("selected_address_id", order.address_id);
    }

    console.log("✅ SessionStorage updated:", {
      cart: mappedItems,
      order_type: "delivery",
      tab: "delivery",
      userId: userId
    });

    // Close modal first
    setShowOrdersModal(false);

    // Small delay to ensure state updates, then navigate
    setTimeout(() => {
      console.log("🚀 Navigating to home with delivery tab...");
      navigate("/", {
        state: {
          orderType: "delivery",
          tabValue: "delivery", // This must be delivery
          userId: userId, // Pass user id to skip the user list
          repeatedOrder: true,
          originalOrderNumber: order.order_number,
          timestamp: Date.now()
        },
        replace: true // Use replace to ensure it triggers state change correctly if on same path
      });
    }, 100);
  };

  const isFormDisabled = loading || isSubmitting;

  console.log("Order Type:", orderType);

  return (
    <div
      className={`bg-gray-100 min-h-screen w-full ${isArabic ? "text-right direction-rtl" : "text-left direction-ltr"
        } ${!searchQuery && filteredusers.length === 0 ? "flex items-center justify-center" : ""}`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      <div className="max-full mx-auto px-6 py-3">
        {/* Search and Add User */}
        <div className="flex gap-2 items-center my-6">
          <Input
            type="text"
            placeholder={t("SearchuserNameorPhone")}
            value={searchQuery}
            onChange={(e) => handleInstantSearch(e.target.value)}
            className="flex-grow p-3 text-lg rounded-lg border-gray-300 bg-white"
          />
          <Button
            onClick={handleAddUser}
            className="bg-bg-primary hover:bg-red-700 text-white rounded-lg px-4 py-3"
          >
            <UserPlus className="w-5 h-5 mr-1" />
            {t('AddUser')}
          </Button>
        </div>

        {isLoading && <Loading />}
        {error && <p className="text-bg-primary">Error: {error.message}</p>}

        {searchQuery ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredusers.length === 0 && !isLoading && !error ? (
              <p className="text-gray-500 text-center col-span-2">
                {t("Nousersfoundmatchingyoursearch")}
              </p>
            ) : (
              filteredusers.map((user) => (
                <div
                  id={`user-card-${user.id}`} // 🟢 هنا
                  key={user.id}
                  className="bg-white rounded-xl shadow-md p-6 transition hover:shadow-lg border"
                >

                  {/* Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-bg-primary" />
                      </div>
                      <div className="text-lg font-semibold text-gray-800">
                        {user.f_name} {user.l_name}
                      </div>
                    </div>
                    <Pencil
                      className="w-5 h-5 text-bg-primary cursor-pointer"
                      onClick={() => handleEditClick(user)}
                    />
                  </div>

                  {/* Phone */}
                  <div className="flex items-center gap-2 mb-4 text-gray-700">
                    <Phone className="w-4 h-4 text-bg-primary" />
                    <span className="text-md">{user.phone}</span>
                  </div>

                  {/* Addresses */}
                  <div className="space-y-3">
                    {user.address && user.address.length > 0 ? (
                      user.address.map((address, index) => (
                        <div
                          key={`${user.id}-${address.id}-${index}`}
                          className={`flex justify-between items-center p-3 rounded-lg cursor-pointer border transition-all ${selectedAddressId === address.id
                            ? "bg-red-50 border-red-500"
                            : "bg-gray-50"
                            }`}
                          onClick={() => {
                            setSelectedAddressId(address.id);
                            setSelectedUserId(user.id);
                            setSelecteduser(user);
                          }}
                        >
                          <div className="flex gap-2 items-start">
                            <MapPin className="w-5 h-5 mt-1 text-bg-primary" />
                            <span className="text-sm text-gray-800">
                              {address.zone?.zone ||
                                address.zone ||
                                "Unknown Zone"}{" "}
                              -{" "}
                              {address.address || address.name || "No address"}
                            </span>
                          </div>
                          <Pencil
                            className="w-4 h-4 text-bg-primary cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditAddressClick(address);
                            }}
                          />
                        </div>
                      ))
                    ) : (
                      <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                        <MapPin className="w-4 h-4" />
                        <span>{t("Noaddressavailable")}</span>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4 mt-5">
                    <button
                      className="flex-1 bg-bg-primary hover:bg-red-700 text-white py-2 rounded-md"
                      onClick={() => navigate(`/add?user_id=${user.id}`)}
                    >
                      + {t("AddAddress")}
                    </button>

                    <button
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md flex items-center justify-center gap-2"
                      onClick={() => handleViewLastOrders(user.id)}
                    >
                      <Clock className="w-4 h-4" />
                      {t("LastOrders")}
                    </button>

                    {selectedAddressId && selectedUserId === user.id && (
                      <button
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md"
                        onClick={() =>
                          handleConfirmDelivery(user, selectedAddressId)
                        }
                      >
                        {t("ConfirmDelivery")}
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-[60vh]">
            <p className="text-center text-gray-500 text-lg">
              🔍 {t("Pleasesearchbynameorphonetofindusers")}
            </p>
          </div>
        )}
      </div>

      {/* Edit User Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="space-y-4 bg-white">
          <h2 className="text-xl font-semibold text-center text-bg-primary">
            {t("Edituser")}
          </h2>

          <Input
            value={editData.f_name}
            onChange={(e) =>
              setEditData({ ...editData, f_name: e.target.value })
            }
            placeholder={t("FirstName")}
            className={`border-gray-300 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
            disabled={isFormDisabled}
          />

          <Input
            value={editData.l_name}
            onChange={(e) =>
              setEditData({ ...editData, l_name: e.target.value })
            }
            placeholder={t("LastName")}
            className={`border-gray-300 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
            disabled={isFormDisabled}
          />

          <Input
            value={editData.phone}
            onChange={(e) =>
              setEditData({ ...editData, phone: e.target.value })
            }
            placeholder={t("Phone")}
            className={`border-gray-300 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
            disabled={isFormDisabled}
          />

          <Input
            value={editData.phone_2}
            onChange={(e) =>
              setEditData({ ...editData, phone_2: e.target.value })
            }
            placeholder={t("AnotherPhone")}
            className={`border-gray-300 ${isFormDisabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : ''
              }`}
            disabled={isFormDisabled}
          />

          <Button
            onClick={handleSaveEdit}
            disabled={isFormDisabled}
            className={`w-full transition-all ${isFormDisabled
              ? 'bg-gray-400 cursor-not-allowed opacity-60'
              : 'bg-bg-primary hover:bg-red-700'
              } text-white`}
          >
            {isFormDisabled ? (
              <div className="flex items-center justify-center gap-2">
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>{t("Saving")}</span>
              </div>
            ) : (
              t("Save")
            )}
          </Button>
        </DialogContent>
      </Dialog>

      {/* Last Orders Modal */}
      <Dialog open={showOrdersModal} onOpenChange={setShowOrdersModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-bg-primary">
              {t("LastOrders")}
            </h2>
            <button
              onClick={() => setShowOrdersModal(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {loadingOrders ? (
            <div className="flex justify-center items-center py-12">
              <Loading />
            </div>
          ) : userOrders.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">{t("NoOrdersFound")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userOrders.map((order) => (
                <div
                  key={order.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                >
                  {/* Order Header */}
                  <div className="flex justify-between items-start mb-3 pb-3 border-b">
                    <div>
                      <p className="font-semibold text-lg text-gray-800">
                        {t("Order")} #{order.order_number}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.date} - {order.time}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-600">
                        {order.amount} {getCurrencySymbol()}
                      </p>
                      {order.total_discount > 0 && (
                        <p className="text-sm text-gray-500">
                          {t("Discount")}: {order.total_discount} {getCurrencySymbol()}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="space-y-2 mb-4">
                    {order.order_details.map((detail, idx) => {
                      const product = detail.product && detail.product[0];
                      if (!product || !product.product) return null;

                      const productData = product.product;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-3 p-2 bg-gray-50 rounded"
                        >
                          {productData.image_link && (
                            <img
                              src={productData.image_link}
                              alt={productData.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">
                              {productData.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              {t("Quantity")}: {product.count} x {productData.price} {getCurrencySymbol()}
                            </p>
                            {product.notes && (
                              <p className="text-xs text-gray-500 italic">
                                {t("Note")}: {product.notes}
                              </p>
                            )}
                            {detail.addons && detail.addons.length > 0 && (
                              <p className="text-xs text-blue-600">
                                + {detail.addons.length} {t("Addons")}
                              </p>
                            )}
                          </div>
                          <p className="font-semibold text-gray-800">
                            {(productData.price * product.count).toFixed(2)} {getCurrencySymbol()}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Repeat Order Button */}
                  <Button
                    onClick={() => handleRepeatOrder(order)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    {t("RepeatThisOrder")}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}