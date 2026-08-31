import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MapPin, Table2, Timer, Clock } from "lucide-react";

// Live timer component — reads start time from localStorage
const LiveTableTimer = ({ startTime }) => {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    if (!startTime) return;

    const calculate = () => {
      const start = new Date(startTime.replace(/-/g, "/"));
      const now = new Date();
      const diffMs = Math.abs(now - start);
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1_000);
      setElapsed(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };

    calculate();
    const id = setInterval(calculate, 1_000);
    return () => clearInterval(id);
  }, [startTime]);

  if (!startTime || !elapsed) return null;

  return (
    <div className="flex items-center gap-1 font-mono text-sm font-bold text-gray-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1 shadow-sm">
      <Clock size={14} className="text-amber-500 animate-pulse" />
      <span>{elapsed}</span>
    </div>
  );
};

const DineInformation = () => {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const hallName          = localStorage.getItem("hall_name");
  const tableNumber       = localStorage.getItem("table_number");
  const orderType         = localStorage.getItem("order_type");
  const preparationNumber = localStorage.getItem("preparation_number");
  const tableStartTimer   = localStorage.getItem("table_start_timer");

  // Hide outside dine-in
  if (orderType !== "dine_in") return null;
  if (!hallName && !tableNumber && !preparationNumber && !tableStartTimer) return null;

  return (
    <div
      className={`bg-gradient-to-r from-gray-50 to-gray-100
      rounded-xl shadow-md p-5 mb-5 flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10
      border border-gray-200 transition-all`}
      dir={isArabic ? "rtl" : "ltr"}
    >
      {/* Hall */}
      {hallName && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("CurrentHall")}</p>
            <p className="text-xl font-bold text-gray-900">{hallName}</p>
          </div>
        </div>
      )}

      {tableNumber && <div className="hidden md:block w-px h-10 bg-red-300" />}

      {/* Table */}
      {tableNumber && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <Table2 size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("Table")}</p>
            <p className="text-xl font-bold text-gray-900">{tableNumber}</p>
          </div>
        </div>
      )}

      {preparationNumber && <div className="hidden md:block w-px h-10 bg-red-300" />}

      {/* Preparation Number */}
      {preparationNumber && (
        <div className="flex items-center gap-3">
          <div className="bg-bg-primary text-white p-2 rounded-lg shadow-sm">
            <Timer size={20} />
          </div>
          <div>
            <p className="text-sm text-gray-600">{t("PrepNumber")}</p>
            <p className="text-xl font-bold text-gray-900">{preparationNumber}</p>
          </div>
        </div>
      )}

      {/* Table Sitting Timer */}
      {tableStartTimer && (
        <>
          <div className="hidden md:block w-px h-10 bg-amber-200" />
          <div className="flex items-center gap-3">
            <div>
              <p className="text-sm text-gray-500 mb-1">{t("TableTimer") || "Table Time"}</p>
              <LiveTableTimer startTime={tableStartTimer} />
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DineInformation;
