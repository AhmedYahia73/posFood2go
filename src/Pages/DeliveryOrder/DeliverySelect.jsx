import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import Loading from "@/components/Loading";
import { useGet } from "@/Hooks/useGet";
import { useTranslation } from "react-i18next";

export default function DeliverySelect({ value, onChange }) {
  const [open, setOpen] = useState(false);

  const {
    data,
    isLoading,
    error,
  } = useGet("cashier/delivery_balance/lists", { useCache: true });
  const { t } = useTranslation();

  // 🧠 deliveries من الريسبونس
  const deliveries = useMemo(
    () => data?.deliveries || [],
    [data]
  );

  const selectedDelivery = deliveries.find(d => d.id === value);

  return (
    <div className="relative w-72">
      {/* Selected */}
      <button
        type="button"
        disabled={isLoading || !!error}
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 border rounded-lg bg-white text-sm
        disabled:bg-gray-100 disabled:cursor-not-allowed
        focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <span className="truncate">
          {isLoading && <Loading />}
          {error && "Failed to load deliveries"}
          {!isLoading && !error && (
            selectedDelivery
              ? `${selectedDelivery.name} (${selectedDelivery.phone})`
              : t("ChooseDeliveryMan")
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>

      {/* Dropdown */}
      {open && !isLoading && !error && (
        <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {deliveries.length === 0 && (
            <div className="px-4 py-2 text-sm text-gray-500">
              No delivery men found
            </div>
          )}

          {deliveries.map((item) => (
            <div
              key={item.id}
              onClick={() => {
                onChange(item);
                setOpen(false);
              }}
              className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
            >
              {item.name} ({item.phone})
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
