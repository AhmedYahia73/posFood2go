import { useMemo } from "react";
import { statusOrder } from "../constants";

export function useOrderCalculations(
  orderItems,
  selectedPaymentItems,
  orderType,
  serviceFeeData,
  deliveryFee = 0,
) {
  return useMemo(() => {
    const items = orderItems ?? [];

    // --- دالة مساعدة لحساب أسعار جميع الإضافات بناءً على هيكل بياناتك ---
    const calculateExtraPrice = (item) => {
      let extraPrice = 0;

      // 1. حساب الـ extras
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        const allExtrasCatalog = item.allExtras || [];
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => String(e.id) === String(id));
          if (extra) {
            extraPrice += parseFloat(extra.price || extra.final_price || 0);
          }
        });
      }

      // 2. حساب الـ addons
      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        if (addon.addon_id !== undefined) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          extraPrice += parseFloat(addon.price || 0) * addonQty;
        }
      });

      // 3. حساب الـ Variations بناءً على selectedVariation (اللغز اللي كان مفقود)
      const selectedVariation = item.selectedVariation;
      const variations = item.variations || [];

      if (selectedVariation && typeof selectedVariation === 'object') {
        Object.entries(selectedVariation).forEach(([variationId, selectedValue]) => {
          const variationGroup = variations.find(v => String(v.id) === String(variationId));
          if (!variationGroup) return;

          let optionsList = [];

          // فحص هل القيمة مصفوفة (زي الأوزان [{optionId: 697, value: 1.75}]) أو ID مباشر (زي 698)
          if (Array.isArray(selectedValue)) {
            selectedValue.forEach(val => {
              if (val && typeof val === 'object' && val.optionId) {
                // استخدم val.value ككمية (وزن) وليس val.weight
                optionsList.push({ id: val.optionId, weight: parseFloat(val.value || 1) });
              } else {
                optionsList.push({ id: val, weight: 1 });
              }
            });
          } else if (selectedValue && typeof selectedValue === 'object' && selectedValue.optionId !== undefined) {
            // ✅ single بالوزن: { optionId, value } - نفس شكل الـ multiple لكن بدون array
            optionsList.push({ id: selectedValue.optionId, weight: parseFloat(selectedValue.value || 0) });
          } else {
            optionsList.push({ id: selectedValue, weight: 1 });
          }

          // ضرب السعر في الوزن المُدخل (value)
          optionsList.forEach(opt => {
            const optionData = variationGroup.options?.find(o => String(o.id) === String(opt.id));
            if (optionData) {
              const optPrice = parseFloat(optionData.price || optionData.additional_price || optionData.final_price || 0);
              extraPrice += (optPrice * opt.weight); // مثال: 65 * 1.75 = 113.75
            }
          });
        });
      }

      return extraPrice;
    };

    // ── Subtotal Calculation ───────────────────────────────────────────
    const subTotal = items.reduce((sum, item) => {
      // الاعتماد على السعر الأساسي الصافي
      const basePrice = parseFloat(item.originalPrice || item.price || 0);

      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      const extraPrice = calculateExtraPrice(item);

      // السعر النهائي = (السعر الأساسي 46.25 + الإضافات 113.75) * الكمية
      return sum + ((basePrice * qty) + extraPrice);
    }, 0);

    // ── Taxes Calculation & Details ────────────────────────────────────
    let totalTax = 0;
    let totalDiscount = 0;
    const taxDetailsMap = {};

    items.forEach((item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? Number(item.quantity || 1)
        : Number(item.count || 1);

      const itemDiscount = Number(item.discount_val || 0);
      totalDiscount += itemDiscount * qty;

      const itemTax = Number(item.tax_only || 0);
      const totalItemTax = itemTax * qty;
      totalTax += totalItemTax;

      if (totalItemTax > 0 && item.tax_obj) {
        const taxName = item.tax_obj.name || "Tax";
        const taxId = item.tax_obj.id || 'default';

        if (!taxDetailsMap[taxId]) {
          taxDetailsMap[taxId] = {
            name: taxName,
            total: 0,
            amount: item.tax_obj.amount,
            type: item.tax_obj.type
          };
        }
        taxDetailsMap[taxId].total += totalItemTax;
      }
    });

    const taxDetails = Object.values(taxDetailsMap);

    // ── Service Fee (dine_in / take_away) ─────────────────────────────
    const sfAmt = serviceFeeData?.amount ?? 0;
    const sfType = serviceFeeData?.type ?? "precentage";
    const applySF = ["dine_in", "take_away"].includes(orderType) && sfAmt > 0;

    const serviceCharge = applySF
      ? sfType === "precentage"
        ? (subTotal + totalTax) * (sfAmt / 100)
        : sfAmt
      : 0;

    // ── Totals ─────────────────────────────────────────────────────────
    const totalBeforeDelivery = subTotal + totalTax + serviceCharge;

    let amountToPay = items.reduce((sum, item) => {
      const basePrice = parseFloat(item.originalPrice || item.price || 0);

      const isWeightProduct = item.weight_status === 1 || item.weight_status === "1";
      const isScaleWeightItem = isWeightProduct && item._source === "scale_barcode";

      const qty = isWeightProduct
        ? (isScaleWeightItem ? Number(item._weight_kg || 0) : Number(item.quantity || 0))
        : Number(item.count || 1);

      const extraPrice = calculateExtraPrice(item);

      return sum + ((basePrice * qty) + extraPrice);
    }, 0);

    amountToPay += serviceCharge;

    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = items.filter(
        (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
      );

      const selSub = selected.reduce((s, i) => {
        const basePrice = parseFloat(i.originalPrice || i.price || 0);
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);

        const extraPrice = calculateExtraPrice(i);

        return s + ((basePrice * qty) + extraPrice);
      }, 0);

      const selTax = selected.reduce((s, i) => {
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);
        const itemTax = Number(i.tax_only || 0);
        return s + (itemTax * qty);
      }, 0);

      let selSF = applySF
        ? sfType === "precentage"
          ? (selSub + selTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selSub / subTotal : 0)
        : 0;

      amountToPay = selected.reduce((s, i) => {
        const basePrice = parseFloat(i.originalPrice || i.price || 0);
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? Number(i.quantity || 1)
          : Number(i.count || 1);

        const extraPrice = calculateExtraPrice(i);

        return s + ((basePrice * qty) + extraPrice);
      }, 0);

      amountToPay += selSF;
    }

    const doneItems = items.filter((i) => i.preparation_status === "done");
    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems?.length > 0
        ? items.filter((i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done")
        : items;

    return {
      subTotal: Number(subTotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      totalDiscount: Number(totalDiscount.toFixed(2)),
      totalOtherCharge: Number(serviceCharge.toFixed(2)),
      totalAmountDisplay: Number(totalBeforeDelivery.toFixed(2)),
      amountToPay: Number(amountToPay.toFixed(2)),
      taxDetails,
      doneItems,
      checkoutItems,
      currentLowestSelectedStatus: statusOrder[0],
      deliveryFee: orderType === "delivery" ? Number(deliveryFee.toFixed(2)) : 0,
    };
  }, [
    orderItems,
    selectedPaymentItems,
    orderType,
    serviceFeeData?.amount,
    serviceFeeData?.type,
    deliveryFee,
  ]);
}