import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

export default function GroupSelector({
    selectedGroup,
    isNormalPrice,
    groupProducts,
    resturantLogo,
    onSelectGroup,
    onSelectNormalPrice,
}) {
    const { t, i18n } = useTranslation();
    const isArabic = i18n.language === "ar";
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Get module order number from localStorage and track changes
    const [moduleOrderNumber, setModuleOrderNumber] = useState(
        localStorage.getItem("module_order_number") || ""
    );

    // Update module order number when it changes in localStorage
    useEffect(() => {
        const checkModuleOrderNumber = () => {
            const currentNumber = localStorage.getItem("module_order_number") || "";
            if (currentNumber !== moduleOrderNumber) {
                setModuleOrderNumber(currentNumber);
            }
        };

        // Check on mount and set up interval to check periodically
        checkModuleOrderNumber();
        const interval = setInterval(checkModuleOrderNumber, 500);

        return () => clearInterval(interval);
    }, [moduleOrderNumber]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Get current selection info
    const getCurrentSelection = () => {
        if (isNormalPrice) {
            return {
                name: t("NormalPrices"),
                image: resturantLogo,
                subtitle: t("RegularMenuPrices"),
            };
        }
        const group = groupProducts.find((g) => g.id.toString() === selectedGroup);
        return {
            name: group?.name || t("NormalPrices"),
            image: group?.icon_link || resturantLogo,
            subtitle: moduleOrderNumber || t("ModuleGroup"),
        };
    };

    const current = getCurrentSelection();

    const handleSelect = (groupId, groupInfo) => {
        if (groupId === "none") {
            onSelectNormalPrice();
        } else {
            onSelectGroup(groupId, groupInfo);
        }
        setIsOpen(false);
    };

    return (
        <div
            ref={dropdownRef}
            className="relative min-w-[220px]"
            dir={isArabic ? "rtl" : "ltr"}
        >
            {/* Selected Option Display */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 bg-white p-2 px-3 rounded-xl border-2 border-gray-200 hover:border-bg-primary/50 transition-all shadow-sm hover:shadow-md"
            >
                <img
                    src={current.image}
                    alt={current.name}
                    className="w-10 h-10 rounded-lg object-cover flex-shrink-0 shadow-sm"
                />
                <div className="flex-1 text-right">
                    <span className="block text-sm font-bold text-gray-800 truncate">
                        {current.name}
                    </span>
                    <span className="block text-[10px] text-gray-500">
                        {current.subtitle}
                    </span>
                </div>
                <span
                    className={`text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                        }`}
                >
                    ▼
                </span>
            </button>

            {/* Dropdown Options */}
            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-2xl border-2 border-gray-100 overflow-hidden z-50 max-h-[400px] overflow-y-auto">
                    {/* Normal Prices Option */}
                    <button
                        type="button"
                        onClick={() => handleSelect("none")}
                        className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-all border-b border-gray-100 ${isNormalPrice ? "bg-red-50" : ""
                            }`}
                    >
                        <img
                            src={resturantLogo}
                            alt="Normal Prices"
                            className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
                        />
                        <div className="flex-1 text-right">
                            <span className="block text-sm font-bold text-gray-800">
                                {t("NormalPrices")}
                            </span>
                            <span className="block text-[10px] text-gray-500">
                                {t("RegularMenuPrices")}
                            </span>
                        </div>
                        {isNormalPrice && (
                            <span className="text-bg-primary text-lg">✓</span>
                        )}
                    </button>

                    {/* Group Products */}
                    {groupProducts.map((group) => {
                        const isSelected =
                            !isNormalPrice && selectedGroup === group.id.toString();
                        return (
                            <button
                                key={group.id}
                                type="button"
                                onClick={() =>
                                    handleSelect(group.id, {
                                        name: group.name,
                                        image: group.icon_link,
                                    })
                                }
                                className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-all border-b border-gray-100 last:border-b-0 ${isSelected ? "bg-red-50" : ""
                                    }`}
                            >
                                <img
                                    src={group.icon_link || "/default-group.png"}
                                    alt={group.name}
                                    className="w-12 h-12 rounded-lg object-cover flex-shrink-0 shadow-md"
                                />
                                <div className="flex-1 text-right">
                                    <span className="block text-sm font-bold text-gray-800">
                                        {group.name}
                                    </span>
                                    <span className="block text-[10px] text-gray-500">
                                        {moduleOrderNumber || t("ModuleGroupPricing")}
                                    </span>
                                </div>
                                {isSelected && (
                                    <span className="text-bg-primary text-lg">✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}