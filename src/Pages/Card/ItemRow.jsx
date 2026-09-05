import React from "react";
import { PREPARATION_STATUSES } from "./constants";
import { Trash2, FileText } from "lucide-react";
import ProductDetailModalWrapper from "./ProductDetailModalWrapper";
import { calculateItemUnitPrice } from "../utils/orderPriceUtils";



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
  orderItems
}) => {
  if (!item) return null;

  const statusInfo = PREPARATION_STATUSES[item.preparation_status] || PREPARATION_STATUSES.pending;
  const StatusIcon = statusInfo.icon;
  const isItemLoading = itemLoadingStates[item.temp_id] || false;

  // ==========================================
  // 🟢 حساب الأسعار بدقة (Logic)
  // ==========================================

  // 1. هل المنتج بالوزن؟
  const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
  const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

  // 2. تحديد الخصم وسعر الوحدة الأساسي
  let hasDiscount = Number(item.discount_val || 0) > 0;

  // السعر الأساسي الابتدائي للمنتج (قبل الضريبة)
  let unitBasePrice = Number(item.price_after_discount || item.price || 0);

  // --- نلوب على كل الـ variations (مش بس الأولى) ---
  // نفس المنطق المستخدم في calculateProductTotalPrice في ProductModal
  let firstSelectedOption = null; // للعرض في اسم الـ item

  if (item.variations && Array.isArray(item.variations)) {
    item.variations.forEach((variation, idx) => {
      const selectedId = variation.selected_option_id;
      if (selectedId === null || selectedId === undefined) return;

      const variationName = (variation.name || "").toLowerCase();
      const isSize =
        variationName.includes('size') ||
        variationName.includes('حجم') ||
        variationName.includes('maqas') ||
        variationName.includes('مقاس');

      if (variation.type === 'single' || !variation.type) {
        // single-select: selected_option_id هو ID واحد
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        ids.forEach(optId => {
          const opt = variation.options?.find(o => o.id === optId);
          if (!opt) return;

          // احتفظ بأول خيار محدد لعرض اسمه في الصف
          if (idx === 0 && !firstSelectedOption) firstSelectedOption = opt;

          const optDiscount = Number(opt.discount_val || 0);
          if (optDiscount > 0) hasDiscount = true;

          const totalOptPrice = Number(opt.total_option_price || 0);

          if (totalOptPrice > 0 && !item.is_group_priced) {
            // هذا الخيار يستبدل السعر الأساسي بالكامل (مثل: حجم سوشي 300 أو 350)
            unitBasePrice = totalOptPrice;
          } else if (isSize && !item.is_group_priced) {
            // حجم عادي بدون total_option_price: استبدال بـ final_price
            const sizePrice = Number(opt.final_price || opt.price_after_tax || 0);
            if (sizePrice > 0) unitBasePrice = sizePrice;
          }
          // غير ذلك: الخيار عبارة عن إضافة عادية وسيُجمع في calculateAddonsTotal
        });
      } else if (variation.type === 'multiple') {
        // multiple-select: selected_option_id هو array
        const ids = Array.isArray(selectedId) ? selectedId : [selectedId];
        ids.forEach(optId => {
          const opt = variation.options?.find(o => o.id === optId);
          if (!opt) return;
          if (idx === 0 && !firstSelectedOption) firstSelectedOption = opt;
        });
      }
    });
  }

  // للتوافق مع كود العرض القديم (اسم الخيار في الصف)
  const selectedOption = firstSelectedOption;

  // 3. السعر الأصلي قبل الخصم (لعرضه مشطوباً)
  let originalUnitBasePrice = hasDiscount
    ? unitBasePrice + (selectedOption ? Number(selectedOption.discount_val || 0) : Number(item.discount_val || 0))
    : unitBasePrice;

  // 4. حساب الإضافات (addons + extras)
  const addonsTotal = calculateItemUnitPrice(item);

  // 5. الكمية / الوزن
  const quantity = isWeightProduct
    ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
    : Number(item.count || 1);

  const displayedUnitPrice = Number(item.final_price || item.price_after_discount || 0);
  const totalPrice = Number(item.totalPrice || item.modalCalculatedPrice || item.price || 0).toFixed(2);
  let displayedOriginalUnitPrice = originalUnitBasePrice + addonsTotal;


  return (
    <tr className={`border-b last:border-b-0 hover:bg-gray-50 ${item.type === "addon" ? "bg-blue-50" : ""} ${selectedPaymentItems?.includes(item.temp_id) ? "bg-green-50" : ""}`}>

      {/* اختيار العنصر (Dine-in) */}
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

{/* اسم المنتج وتفاصيله */}
<td className="p-2 text-left align-top">
  <ProductDetailModalWrapper product={item} updateOrderItems={updateOrderItems} orderItems={orderItems} orderType={orderType} tableId={tableId}>
    <div className="flex flex-col gap-0.5">
      
      {/* 1. السطر الرئيسي: الكمية + الاسم */}
      <div className="text-gray-900 font-semibold text-[14px] leading-tight flex items-center gap-2">
        <span className="bg-red-50 text-red-600 text-[11px] font-bold px-1.5 py-0.5 rounded-md min-w-[35px] text-center">
          {isWeightProduct && quantity < 1 && quantity > 0
            ? (quantity.toFixed(2) + 'kg')
            : `${Math.round(quantity)}x`}
        </span>
        {item.name || item.product_name}
      </div>

{/* تفاصيل الاختيارات في سطر واحد */}
<div className="flex flex-wrap items-center gap-1.5 mt-1">
  
  {/* 1. عرض الـ Variations */}
  {item.variations?.map((v, i) => {
    let selectedName = "";
    let extraInfo = "";

    if (v.type === "multiple" && item.selectedVariation?.[v.id]) {
       const sel = Array.isArray(item.selectedVariation[v.id]) ? item.selectedVariation[v.id][0] : item.selectedVariation[v.id];
       const opt = sel ? v.options?.find(o => o.id === (sel.optionId || sel.id)) : null;
       selectedName = opt?.name || "";
       extraInfo = sel?.value ? `(${sel.value} KG)` : "";
    } else {
       const selected = v.options?.find(opt => opt.id === v.selected_option_id);
       selectedName = selected?.name || "";
    }

    return selectedName ? (
      <span key={`var-${i}`} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 whitespace-nowrap">
        {selectedName} {extraInfo && <span className="font-bold opacity-75">{extraInfo}</span>}
      </span>
    ) : null;
  })}

  {/* 2. عرض الـ Addons */}
  {item.addons?.filter(ad => ad.selected || ad.quantity > 0).map((ad, i) => (
    <span key={`addon-${i}`} className="text-[10px] text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">
      +{ad.name}
    </span>
  ))}

  {/* 3. عرض الـ Extras والـ Addons المحفوظة في selectedExtras */}
  {item.selectedExtras?.map((exId, i) => {
    const extraObj = [...(item.allExtras || []), ...(item.addons || [])].find(e => String(e.id) === String(exId));
    return (
      <span key={`extra-${i}`} className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded border border-green-100 whitespace-nowrap">
        +{extraObj?.name || 'Extra'}
      </span>
    );
  })}
</div>
      {/* ملاحظات المنتج (إن وجدت) */}
      {item.notes && (
        <div className="text-[9px] text-orange-500 italic mt-1 ml-[45px]">
          {item.notes}
        </div>
      )}
    </div>
  </ProductDetailModalWrapper>
</td>

      {/* عمود سعر الوحدة */}
      <td className="py-3 px-4 text-center align-top">
        <div className="flex flex-col items-center">
          <span className={hasDiscount ? "text-red-600 font-bold" : "font-medium"}>
            {displayedUnitPrice.toFixed(2)}
          </span>
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">
              {displayedOriginalUnitPrice.toFixed(2)}
            </span>
          )}
        </div>
      </td>

      {/* حالة التحضير (Dine-in) */}
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
          {item.preparation_status === "done" ? (
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

      {/* السعر الإجمالي للعنصر */}
      <td className="py-3 px-4 text-center align-top">
        <span className="font-bold text-gray-900 text-sm">{totalPrice}</span>
      </td>

      {/* عمليات الحذف */}
      <td className="p-2 text-center align-top">
        <button
          onClick={() => orderType === "dine_in" ? handleVoidItem(item.temp_id) : handleRemoveFrontOnly(item.temp_id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 size={18} />
        </button>
      </td>
    </tr>
  );
};

export default ItemRow;