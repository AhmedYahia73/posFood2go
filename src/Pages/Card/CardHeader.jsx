import React from "react";
import { Button } from "@/components/ui/button";
import {
  Clock,
  Tag,
  History,
  Save,
  MoveRight,
  Gift
} from "lucide-react";


export default function CardHeader({
  orderType,
  orderItems,
  handleViewOrders,
  handleViewPendingOrders,
  onShowOfferModal,
  onShowDealModal,
  isLoading,
  onSaveAsPending,
  onTransferToDineIn,
  t,
}) {
  return (
    <div className="flex flex-col gap-4 mb-4 bg-white  rounded-xl  ">
      {/* شبكة الأزرار: 3 في كل صف بنفس الحجم */}
      <div className="grid grid-cols-3 gap-2">



        {/* أزرار العروض والصفقات - تظهر حسب شرط الـ orderType في كودك */}
        {orderType !== "delivery" && (
          <>
            <HeaderButton
              onClick={onShowOfferModal}
              icon={<Gift size={20} />}
              label={t("Points")}
              color="bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            />
            <HeaderButton
              onClick={onShowDealModal}
              icon={<Tag size={20} />}
              label={t("ApplyDeal")}
              color="bg-orange-600 hover:bg-orange-700"
              disabled={isLoading}
            />
          </>
        )}
        {/* زر الطلبات السابقة - متاح دائماً */}
        <HeaderButton
          onClick={handleViewOrders}
          icon={<History size={20} />}
          label={t("ViewOrders")}
          color="bg-gray-500 hover:bg-gray-600"
          disabled={isLoading}
        />

        {/* أزرار الـ Take Away - تظهر حسب شرط الـ orderType في كودك */}
        {orderType === "take_away" && (
          <>
            <HeaderButton
              onClick={handleViewPendingOrders}
              icon={<Clock size={20} />}
              label={t("PendingOrders")}
              color="bg-yellow-600 hover:bg-yellow-500"
              disabled={isLoading}
            />
            <HeaderButton
              onClick={onSaveAsPending}
              icon={<Save size={20} />}
              label={t("SaveasPending")}
              color="bg-orange-600 hover:bg-orange-700"
              disabled={isLoading}
            />
            <HeaderButton
              onClick={onTransferToDineIn}
              icon={<MoveRight size={20} />}
              label={t("TransferDineIn")}
              color="bg-blue-600 hover:bg-blue-500"
              disabled={isLoading}
            />
          </>
        )}
      </div>
    </div>
  );
}

// مكون الزر الموحد لضمان التناسق في الحجم والشكل
const HeaderButton = ({ onClick, icon, label, color, disabled }) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    className={`${color} text-white flex flex-col items-center justify-center gap-1 h-20 rounded-xl shadow-sm transition-all hover:scale-[1.02] active:scale-95 border-none p-1`}
  >
    {icon}
    <span className="text-[12px] font-bold uppercase tracking-tighter text-center leading-tight whitespace-normal">
      {label}
    </span>
  </Button>
);