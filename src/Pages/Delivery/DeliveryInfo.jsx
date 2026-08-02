// components/DeliveryInfo.jsx
import React from "react";
import Loading from "@/components/Loading";
import { XCircle } from "lucide-react"; // Import XCircle for the close icon
import { useTranslation } from "react-i18next";

const DeliveryInfo = ({ orderType, deliveryUserData, userLoading, userError, onClose }) => {
  const handleClose = () => {
    if (onClose) {
      onClose();
    }
  };
    const { t ,i18n } = useTranslation();
  
   if (orderType !== "delivery") return null;
  return (
    <div dir={i18n.language === "ar" ? "rtl" : "ltr"} className="bg-white shadow-lg p-6 rounded-lg mb-6 border border-gray-200 relative">
      <button
        onClick={handleClose}
        className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 transition-colors"
        aria-label="Close delivery info"
      >
        <XCircle className="w-6 h-6" />
      </button>
      <h3 className="text-lg font-semibold text-bg-primary mb-4 flex items-center">
        <span className="mr-2">🚚</span>
        {t("DeliveryInformation")}
      </h3>

      {userLoading ? (
        <div className="flex justify-center">
          <Loading />
        </div>
      ) : userError ? (
        <div className="text-red-500 p-4 bg-red-50 rounded-lg">
          <p>{t("Failedtoloaduserinformation")}</p>
          <p className="text-sm mt-1">{t("Error")}: {userError.message}</p>
        </div>
      ) : deliveryUserData ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("CustomerName")}</p>
              <p className="font-semibold text-gray-800">
                {deliveryUserData.f_name} {deliveryUserData.l_name}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-xl">📞</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("PhoneNumber")}</p>
              <p className="font-semibold text-gray-800">
                {deliveryUserData.phone || "N/A"}
              </p>
              {deliveryUserData.phone_2 && (
                <p className="text-sm text-gray-500">
                  {t("Alt")}: {deliveryUserData.phone_2}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
              <span className="text-xl">🏠</span>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t("DeliveryAddress")}</p>
              <p className="font-semibold text-gray-800">
                {deliveryUserData.selectedAddress?.zone?.zone || "N/A"}
              </p>
              <p className="text-sm text-gray-600">
                {deliveryUserData.selectedAddress?.address || "N/A"}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-yellow-600 p-4 bg-yellow-50 rounded-lg">
          <p> {t("Nouserinformationavailable")}</p>
          <p className="text-sm mt-1">
            {t("Pleaseselectacustomerfromthedeliverypage")}
          </p>
        </div>
      )}
    </div>
  );
};

export default DeliveryInfo;
