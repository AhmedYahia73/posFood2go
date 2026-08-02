import React, { useState, useEffect } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import Loading from "@/components/Loading";
import { useDeliveryForm } from "@/Hooks/useDeliveryForm";
import MapComponent from "@/components/MapComponent";
import UserFormFields from "./UserFormFields";
import AddressFormFields from "./AddressFormFields";
import { useTranslation } from "react-i18next";
import { useGet } from "@/Hooks/useGet";

export default function DeliveryAdd() {
  // إضافة state للتحكم في حالة الـ submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { t ,i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const {
    form,
    selectedLocation,
    setSelectedLocation,
    locationName,
    setLocationName,
    availableZones,
    formattedMapCoordinates,
    cities,
    isEditMode,
    isAddAnotherAddress,
    userIdFromUrl,
    editAddressData,
    isLoadingLists,
    isLoadingEditData,
    isLoadinguserData,
    handleCityChange,
    handleMarkerDragEnd,
    isAutoAddress,
    setIsAutoAddress,
    handleMapClick,
  } = useDeliveryForm();

  const navigate = useNavigate();
  const { loading, error, postData } = usePost();
  const { clearCache } = useGet("cashier/user", { useCache: true });

  // 🟢 اجعل الـ switch يكون manual (isAutoAddress = false) بشكل افتراضي في كل مرة تدخل الصفحة
  useEffect(() => {
    setIsAutoAddress(false);
  }, [setIsAutoAddress]);

  const onSubmit = async (values) => {
    if (isSubmitting || loading) return;

    setIsSubmitting(true);

    try {
      console.log("Form Values:", values);
      console.log("Selected Location:", selectedLocation);

      if (!values.city_id) {
        toast.error(t("Pleaseselectacity"));
        setIsSubmitting(false);
        return;
      }
      if (!values.zone_id) {
        toast.error("Pleaseselectazone");
        setIsSubmitting(false);
        return;
      }
      if (!values.address || values.address.length < 5) {
        toast.error("Pleaseprovideavalidaddress");
        setIsSubmitting(false);
        return;
      }

      const addressObject = {
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        map: formattedMapCoordinates,
        street: values.street || "",
        building_num: values.building_num || "",
        floor_num: values.floor_num || "",
        apartment: values.apartment || "",
        city_id: Number(values.city_id),
        zone_id: Number(values.zone_id),
        address: values.address,
        additional_data: values.additional_data,
        type: values.type,
      };

      let finalPayload;
      let apiEndpoint;

      if (isEditMode) {
        const addressId = editAddressData?.addresses?.[0]?.id || editAddressData?.address?.id;
        if (!addressId) {
          toast.error(t("AddressIDnotfound"));
          setIsSubmitting(false);
          return;
        }
        finalPayload = { ...addressObject, user_id: editAddressData?.user_id };
        apiEndpoint = `cashier/user/address/update/${addressId}`;
      } else if (isAddAnotherAddress) {
        finalPayload = { ...addressObject, user_id: Number(userIdFromUrl) };
        apiEndpoint = `cashier/user/address/add/${userIdFromUrl}`;
      } else {
        finalPayload = {
          f_name: values.f_name,
          l_name: values.l_name,
          phone: values.phone,
          addresses: [addressObject],
        };
        if (values.phone_2?.trim()) {
          finalPayload.phone_2 = values.phone_2;
        }
        apiEndpoint = "cashier/user/add";
      }

      console.log("Final Payload:", finalPayload);

      const response = await postData(apiEndpoint, finalPayload);
      
if (response && response.success) {
  toast.success(
    `${isEditMode ? t("Addressupdated") : isAddAnotherAddress ? t("Addressadded") : t("Useradded")} ${t("successfully")}!`
  );

  clearCache();

  if (!isEditMode && !isAddAnotherAddress) {
    form.reset();
  }

  let redirectUserId = null;
  // ... (نفس كود تحديد الـ ID) ...
  if (isEditMode) {
    redirectUserId = editAddressData?.user_id;
  } else if (isAddAnotherAddress) {
    redirectUserId = userIdFromUrl;
  } else {
    redirectUserId = response?.user?.id || response?.id || response?.data?.id || response?.new_user?.id;
  }

  // 🔥🔥🔥 الإضافة الجديدة هنا 🔥🔥🔥
  // 1. بنحفظ رقم التليفون عشان يتحط في خانة البحث أوتوماتيك
  if (values.phone) {
    localStorage.setItem("delivery_search_query", values.phone);
  }
  
  // 2. بنحفظ الـ ID عشان يعمل Scroll عليه (ده موجود أصلاً في كودك بس للتأكيد)
  if (redirectUserId) {
    localStorage.setItem("last_selected_user_id", redirectUserId);
  }
  // 🔥🔥🔥 نهاية الإضافة 🔥🔥🔥

  let redirectPath = "/";
  if (redirectUserId) {
    redirectPath += `?user_id=${redirectUserId}&refetch=true`;
  } else {
    redirectPath += "?refetch=true";
  }

  setTimeout(() => {
    navigate(redirectPath, { replace: true });
  });
      } else {
        toast.error(response?.message || t("Operationfailed"));
      }
    } catch (err) {
      console.error("Submit Error:", err);

      let errorMessage = t("Anunexpectederroroccurred");

      if (err.response) {
        const { data } = err.response;

        if (data?.errors && typeof data.errors === "object") {
          const errorMessages = Object.values(data.errors).flat();
          errorMessage = errorMessages.join(" ");
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (data?.error) {
          errorMessage = data.error;
        } else {
          errorMessage = t("FailedtosubmitPleasetryagain");
        }
      } else if (err.request) {
        errorMessage = t("NoresponsefromserverCheckyourinternetconnection");
      } else {
        errorMessage = err.message || t("Unknownerror");
      }

      setTimeout(() => {
        toast.error(errorMessage);
      }, 100);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state for address lists
  if (isLoadingLists) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // Loading state for edit mode or add another address mode
  if (isEditMode && isLoadingEditData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // Show loading for user data in add-another-address mode
  if (isAddAnotherAddress && isLoadinguserData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loading />
      </div>
    );
  }

  // حساب حالة الـ button (disabled إذا كان هناك loading أو submission)
  const isButtonDisabled = loading || isSubmitting;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-800 text-center mb-8">
          {isEditMode
            ? t("EditDeliveryAddress")
            : isAddAnotherAddress
              ? t("AddAnotherAddressforUser")
              : t("AddNewDeliveryUser")}
        </h2>
        <div className="grid grid-cols-1  gap-8">
          {/* Left - Map */}
          {/* <MapComponent
            selectedLocation={selectedLocation}
            setSelectedLocation={setSelectedLocation}
            handleMarkerDragEnd={handleMarkerDragEnd}
            handleMapClick={handleMapClick}
            isMapClickEnabled={isAutoAddress}
            isMapInteractionEnabled={isAutoAddress}
            form={form}
          /> */}

          {/* Right - Form */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                {/* User fields only in Add User mode */}
                {!isEditMode && !isAddAnotherAddress && (
                  <UserFormFields form={form} />
                )}

                {/* Address fields - show in all modes */}
                <AddressFormFields
                  form={form}
                  locationName={locationName}
                  setLocationName={setLocationName}
                  cities={cities}
                  availableZones={availableZones}
                  handleCityChange={handleCityChange}
                  isAutoAddress={isAutoAddress}
                  setIsAutoAddress={setIsAutoAddress}
                />

                {/* الزرار المحدث مع الـ disabled state */}
                <Button
                  type="submit"
                  className={`w-full mt-4 transition-all ${
                    isButtonDisabled 
                      ? 'bg-gray-400 cursor-not-allowed opacity-60' 
                      : 'bg-bg-primary hover:bg-red-700 cursor-pointer'
                  }`}
                  disabled={isButtonDisabled}
                >
                  {/* عرض نص مختلف حسب الحالة */}
                  {isButtonDisabled ? (
                    <div className="flex items-center justify-center gap-2">
                      {/* أيقونة التحميل */}
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
                        ></circle>
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      <span>
                        {isEditMode
                          ? t("Updating")
                          : isAddAnotherAddress
                            ? t("Adding")
                            : t("Adding")}
                      </span>
                    </div>
                  ) : (
                    <span>
                      {isEditMode
                        ? t("UpdateAddress")
                        : isAddAnotherAddress
                          ? t("AddAddress")
                          : t("AddUser")}
                    </span>
                  )}
                </Button>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </form>
            </Form>
          </div>
        </div>
      </div>
      <ToastContainer/>
    </div>
  );
}

