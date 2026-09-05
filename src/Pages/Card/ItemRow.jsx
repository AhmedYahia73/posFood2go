import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePost } from "@/Hooks/usePost";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2, Timer, Square } from "lucide-react";
import ProductDetailModalWrapper from "./ProductDetailModalWrapper";
import { calculateItemUnitPrice } from "../utils/orderPriceUtils";
import {
  calculateProductTimePrice,
  elapsedMinutes,
  formatMinutes,
} from "../utils/calculateProductTimePrice";

// ── Live elapsed-time display for product_time items ──────────────────────────
const ProductTimeElapsed = ({ startMs, t }) => {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    if (!startMs) return;
    const startNum = Number(startMs);
    if (isNaN(startNum) || startNum <= 0) return;

    const tick = () => {
      const diffMs = Math.max(0, Date.now() - startNum);
      const h = Math.floor(diffMs / 3_600_000);
      const m = Math.floor((diffMs % 3_600_000) / 60_000);
      const s = Math.floor((diffMs % 60_000) / 1_000);
      setDisplay(
        `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
      );
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [startMs]);

  return (
    <span className="font-mono text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
      {display}
    </span>
  );
};

const ItemRow = ({
  item,
  orderType,
  tableId,
  selectedItems,
  toggleSelectItem,
  selectedPaymentItems,
  itemLoadingStates,
  handleUpdatePreparationStatus,
  toggleSelectPaymentItem,
  handleVoidItem,
  handleRemoveFrontOnly,
  updateOrderItems,
  orderItems,
}) => {
  if (!item) return null;

  const { t } = useTranslation();
  const { postData } = usePost();

  const statusInfo =
    PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;

  // ─── Product by Time ───────────────────────────────────────────────────────
  const isProductTime = Boolean(item.product_time);
  const isDineIn = orderType === "dine_in";
  const sessionActive = isProductTime && isDineIn && !item.time_ended;
  const sessionEnded  = isProductTime && isDineIn && item.time_ended;

  const handleEndSession = async () => {
    if (!updateOrderItems || !orderItems || !item.cart_id) return;
    const endMs    = Date.now();
    const startMs  = item.time_start || endMs;
    const mins     = elapsedMinutes(startMs, endMs);
    const price    = calculateProductTimePrice(item, mins);

    try {
      await postData("cashier/end_time_session", {
        cart_id: item.cart_id.toString(),
        time_end: endMs.toString(),
        amount: price,
        prepration_status: "done"
      }, true);

      const updated = orderItems.map((i) =>
      i.temp_id === item.temp_id
        ? {
            ...i,
            time_ended:       true,
            time_end:         endMs,
            elapsed_minutes:  mins,
            totalPrice:       price,
            modalCalculatedPrice: price,
            preparation_status: "done"
          }
        : i
      );
      updateOrderItems(updated);
    } catch (error) {
      console.error("Failed to end session:", error);
    }
  };

  // ─── Pricing display ───────────────────────────────────────────────────────
  const isWeightProduct  = item.weight_status === 1 || item.weight_status === "1";
  const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";
  let hasDiscount = Number(item.discount_val || 0) > 0;
  let unitBasePrice = Number(item.price_after_discount || item.price || 0);
  let firstSelectedOption = null;

  if (item.variations && Array.isArray(item.variations)) {
    item.variations.forEach((variation, idx) => {
      const selectedId = variation.selected_option_id;
      if (selectedId === null || selectedId === undefined) return;
      const variationName = (variation.name || "").toLowerCase();
      const isSize =
        variationName.includes("size") ||
        variationName.includes("حجم") ||
        variationName.includes("maqas") ||
        variationName.includes("مقاس");
      if (variation.type === "single" || !variation.type) {
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        ids.forEach((optId) => {
          const opt = variation.options?.find((o) => o.id === optId);
          if (!opt) return;
          if (idx === 0 && !firstSelectedOption) firstSelectedOption = opt;
          const optDiscount = Number(opt.discount_val || 0);
          if (optDiscount > 0) hasDiscount = true;
          const totalOptPrice = Number(opt.total_option_price || 0);
          if (totalOptPrice > 0 && !item.is_group_priced) {
            unitBasePrice = totalOptPrice;
          } else if (isSize && !item.is_group_priced) {
            const sizePrice = Number(opt.final_price || opt.price_after_tax || 0);
            if (sizePrice > 0) unitBasePrice = sizePrice;
          }
        });
      } else if (variation.type === "multiple") {
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        ids.forEach((optId) => {
          const opt = variation.options?.find((o) => o.id === optId);
          if (!opt) return;
          if (idx === 0 && !firstSelectedOption) firstSelectedOption = opt;
        });
      }
    });
  }

  const selectedOption = firstSelectedOption;
  let originalUnitBasePrice = hasDiscount
    ? unitBasePrice +
      (selectedOption
        ? Number(selectedOption.discount_val || 0)
        : Number(item.discount_val || 0))
    : unitBasePrice;

  const addonsTotal = calculateItemUnitPrice(item);
  const quantity = isWeightProduct
    ? isScaleWeightItem
      ? Number(item._weight_kg || 0)
      : Number(item.quantity || 0)
    : Number(item.count || 1);

  const isTaxInc =
    item?.taxes === "included" ||
    item?.taxes?.setting === "included" ||
    item?.tax_obj?.setting === "included";

  const displayedUnitPrice = isTaxInc
    ? Number(item.final_price || item.price_after_tax || item.price || 0)
    : Number(item.price_after_discount || item.price || item.final_price || 0);

  // For product_time: show computed total or "—" if still running
  const totalPrice = isProductTime && isDineIn
    ? sessionEnded
      ? Number(item.totalPrice || 0).toFixed(2)
      : "—"
    : Number(item.totalPrice || item.modalCalculatedPrice || item.price || 0).toFixed(2);

  let displayedOriginalUnitPrice = originalUnitBasePrice + addonsTotal;

  return (
    <tr
      className={`border-b last:border-b-0 hover:bg-gray-50
        ${item.type === "addon" ? "bg-blue-50" : ""}
        ${selectedPaymentItems?.includes(item.temp_id) ? "bg-green-50" : ""}
        ${isProductTime && isDineIn ? "bg-amber-50/30" : ""}`}
    >
      {/* Select checkbox (Dine-in) */}
      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          <input
            type="checkbox"
            checked={selectedItems.includes(item.temp_id)}
            onChange={() => toggleSelectItem(item.temp_id)}
            className="w-4 h-4 accent-bg-primary"
          />
        </td>
      )}

      {/* Product name & details */}
      <td className="p-2 text-left align-top">
        <ProductDetailModalWrapper
          product={item}
          updateOrderItems={updateOrderItems}
          orderItems={orderItems}
          orderType={orderType}
          tableId={tableId}
        >
          <div className="flex flex-col gap-0.5">
            {/* Quantity + name */}
            <div className="text-gray-900 font-semibold text-[14px] leading-tight flex items-center gap-2">
              <span className="bg-red-50 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[35px] text-center">
                {isWeightProduct && quantity < 1 && quantity > 0
                  ? quantity.toFixed(2) + "kg"
                  : `${Math.round(quantity)}x`}
              </span>
              {item.name || item.product_name}

              {/* Product-time badge */}
              {isProductTime && isDineIn && (
                <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                  <Timer size={10} />
                  {sessionActive ? "⏱" : "✓"}
                </span>
              )}
            </div>

            {/* Variations / Addons / Extras / Excludes */}
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              {item.variations?.map((v, i) => {
                let selectedName = "";
                let extraInfo = "";
                if (v.type === "multiple" && item.selectedVariation?.[v.id]) {
                  const arr = Array.isArray(item.selectedVariation[v.id])
                    ? item.selectedVariation[v.id]
                    : [item.selectedVariation[v.id]];
                  const sel = arr[0];
                  if (sel !== undefined && sel !== null) {
                    const selOptionId =
                      typeof sel === "object" ? sel.optionId || sel.id : sel;
                    const opt = v.options?.find(
                      (o) => String(o.id) === String(selOptionId)
                    );
                    selectedName = opt?.name || "";
                    extraInfo =
                      typeof sel === "object" && sel.value
                        ? `(${sel.value} KG)`
                        : "";
                  }
                } else {
                  const selected = v.options?.find(
                    (opt) => opt.id === v.selected_option_id
                  );
                  selectedName = selected?.name || "";
                }
                return selectedName ? (
                  <span
                    key={`var-${i}`}
                    className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap"
                  >
                    {selectedName}{" "}
                    {extraInfo && (
                      <span className="font-bold opacity-75">{extraInfo}</span>
                    )}
                  </span>
                ) : null;
              })}

              {item.addons
                ?.filter((ad) => ad.selected || ad.quantity > 0)
                .map((ad, i) => (
                  <span
                    key={`addon-${i}`}
                    className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap"
                  >
                    +{ad.name}
                  </span>
                ))}

              {/* 3. عرض الـ Extras والـ Addons المحفوظة في selectedExtras */}
              {item.selectedExtras?.map((exId, i) => {
                const extraObj = [...(item.allExtras || []), ...(item.addons || [])].find(
                  (e) => String(e.id) === String(exId)
                );
                return (
                  <span
                    key={`extra-${i}`}
                    className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap"
                  >
                    +{extraObj?.name || "Extra"}
                  </span>
                );
              })}

              {item.selectedExcludes?.map((exId, i) => (
                <span
                  key={`exclude-${i}`}
                  className="text-[10px] text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-100 whitespace-nowrap line-through"
                >
                  {item.excludes?.find((e) => e.id === exId)?.name || "Exclude"}
                </span>
              ))}
            </div>

            {/* Product-time: live elapsed / ended info */}
            {isProductTime && isDineIn && (
              <div className="flex items-center gap-2 mt-1.5">
                {sessionActive && item.time_start && (
                  <ProductTimeElapsed startMs={item.time_start} />
                )}
                {sessionEnded && (
                  <span className="text-[11px] text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5 font-medium">
                    {formatMinutes(
                      item.time_start && item.time_end
                        ? elapsedMinutes(Number(item.time_start), Number(item.time_end))
                        : item.elapsed_minutes || 0
                    )}
                  </span>
                )}
              </div>
            )}
      {/* ملاحظات المنتج (إن وجدت) */}
      {item.notes && (
        <div className="text-[9px] text-orange-500 italic mt-1 ml-[45px]">
          {item.notes}
        </div>
      )}
    </div>
  </ProductDetailModalWrapper>
</td>

      {/* Unit price */}
      <td className="py-3 px-4 text-center align-top">
        <div className="flex flex-col items-center">
          {isProductTime && isDineIn ? (
            <span className="text-xs text-amber-600">
              {Number(item.price_after_discount || item.price || 0).toFixed(2)}/unit
            </span>
          ) : (
            <>
              <span className={hasDiscount ? "text-red-600 font-bold" : "font-medium"}>
                {displayedUnitPrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-gray-400 line-through">
                  {displayedOriginalUnitPrice.toFixed(2)}
                </span>
              )}
            </>
          )}
        </div>
      </td>

      {/* Preparation status (Dine-in) */}
      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          <button
            onClick={() => handleUpdatePreparationStatus(item.temp_id)}
            className={`p-1.5 rounded-full ${statusInfo.color} transition-colors`}
            disabled={isItemLoading}
          >
            {isItemLoading ? (
              <div className="w-4 h-4 border-2 border-t-transparent animate-spin rounded-full" />
            ) : (
              <StatusIcon size={16} />
            )}
          </button>
        </td>
      )}

      {orderType === "dine_in" && (
        <td className="p-2 text-center align-middle">
          {/* Product-time End button OR normal payment checkbox */}
          {isProductTime ? (
            sessionActive ? (
              <button
                onClick={handleEndSession}
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg px-2 py-1.5 transition-colors shadow-sm"
                title="End timed session"
              >
                <Square size={12} fill="currentColor" />
                End
              </button>
            ) : (
              <span className="text-[10px] text-green-600 font-semibold">Done</span>
            )
          ) : item.preparation_status === "done" ? (
            <input
              type="checkbox"
              checked={selectedPaymentItems?.includes(item.temp_id)}
              onChange={() => toggleSelectPaymentItem(item.temp_id)}
              className="w-5 h-5 accent-green-600 cursor-pointer"
            />
          ) : (
            <span className="text-gray-300 text-xs italic">Wait</span>
          )}
        </td>
      )}

      {/* Total price */}
      <td className="py-3 px-4 text-center align-top">
        <span className={`font-bold text-sm ${sessionActive ? "text-amber-400" : "text-gray-900"}`}>
          {totalPrice}
        </span>
      </td>

      {/* Delete */}
      <td className="p-2 text-center align-top">
        <button
          onClick={() =>
            orderType === "dine_in"
              ? handleVoidItem(item.temp_id)
              : handleRemoveFrontOnly(item.temp_id)
          }
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export default ItemRow;