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

    // ── Helper to check if tax is included in price ──────────────────
    const isTaxIncluded = (item) => {
      const setting =
        item?.taxes?.setting ||
        item?.taxes ||
        item?.tax_obj?.setting ||
        item?.tax?.setting ||
        item?.product?.taxes?.setting ||
        item?.product?.taxes;

      return setting === "included";
    };

    // --- دالة مساعدة لحساب أسعار جميع الإضافات بناءً على هيكل بياناتك ---
    const calculateExtraPrice = (item) => {
      let extraPrice = 0;
      const isIncluded = isTaxIncluded(item);

      // 1. حساب الـ extras
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        const allExtrasCatalog = item.allExtras || [];
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => String(e.id) === String(id));
          if (extra) {
            const priceToUse = isIncluded
              ? parseFloat(extra.final_price || extra.price_after_tax || extra.price || 0)
              : parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
            extraPrice += priceToUse;
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

      // 3. حساب الـ Variations بناءً على selectedVariation
      const selectedVariation = item.selectedVariation;
      const variations = item.variations || [];

      if (selectedVariation && typeof selectedVariation === 'object') {
        Object.entries(selectedVariation).forEach(([varId, selected]) => {
          const variation = variations.find((v) => String(v.id) === String(varId));
          if (!variation) return;

          // Single selection variation
          if (variation.type === 'single') {
            const selectedOptionId = typeof selected === 'object' ? selected.optionId : selected;
            const opt = (variation.options || []).find((o) => String(o.id) === String(selectedOptionId));
            if (opt) {
              const isWeightOption = variation.weight === 1 || variation.weight === '1' || opt.weight === 1 || opt.weight === '1';
              if (isWeightOption) {
                const enteredWeight = typeof selected === 'object' ? parseFloat(selected.value) || 0 : 0;
                extraPrice += parseFloat(opt.price || 0) * enteredWeight;
              } else {
                extraPrice += parseFloat(opt.price || 0);
              }
            }
          }
          // Multiple selection variation
          else if (variation.type === 'multiple' && Array.isArray(selected)) {
            selected.forEach((selItem) => {
              let opt, quantity = 1;
              if (selItem && typeof selItem === 'object') {
                opt = (variation.options || []).find((o) => String(o.id) === String(selItem.optionId));
                quantity = parseFloat(selItem.value) || 1;
              } else {
                opt = (variation.options || []).find((o) => String(o.id) === String(selItem));
              }
              if (opt) {
                extraPrice += parseFloat(opt.price || 0) * quantity;
              }
            });
          }
        });
      }

      return extraPrice;
    };

    // --- دالة مساعدة لحساب ضرائب جميع الإضافات ---
    const calculateExtraTax = (item) => {
      let extraTax = 0;

      // 1. حساب ضريبة الـ extras
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        const allExtrasCatalog = item.allExtras || [];
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => String(e.id) === String(id));
          if (extra) {
            let taxVal = parseFloat(extra.tax_val || extra.tax_only || 0);
            if (!taxVal && extra.price_after_tax && extra.price) {
              taxVal = Math.max(0, parseFloat(extra.price_after_tax) - parseFloat(extra.price));
            }
            extraTax += taxVal;
          }
        });
      }

      // 2. حساب ضريبة الـ addons
      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        if (addon.addon_id !== undefined) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          extraTax += parseFloat(addon.tax_val || addon.tax_only || 0) * addonQty;
        }
      });

      // 3. حساب ضريبة الـ Variations بناءً على selectedVariation
      const selectedVariation = item.selectedVariation;
      const variations = item.variations || [];

      if (selectedVariation && typeof selectedVariation === 'object') {
        Object.entries(selectedVariation).forEach(([variationId, selectedValue]) => {
          const variationGroup = variations.find(v => String(v.id) === String(variationId));
          if (!variationGroup) return;

          let optionsList = [];

          if (Array.isArray(selectedValue)) {
            selectedValue.forEach(val => {
              if (val && typeof val === 'object' && val.optionId) {
                optionsList.push({ id: val.optionId, weight: parseFloat(val.value || 1) });
              } else {
                optionsList.push({ id: val, weight: 1 });
              }
            });
          } else if (selectedValue && typeof selectedValue === 'object' && selectedValue.optionId !== undefined) {
            optionsList.push({ id: selectedValue.optionId, weight: parseFloat(selectedValue.value || 0) });
          } else {
            optionsList.push({ id: selectedValue, weight: 1 });
          }

          optionsList.forEach(opt => {
            const optionData = variationGroup.options?.find(o => String(o.id) === String(opt.id));
            if (optionData) {
              const optTax = parseFloat(optionData.tax_val || optionData.tax_only || 0);
              extraTax += (optTax * opt.weight);
            }
          });
        });
      }

      return extraTax;
    };


    // ── Helper to check if tax is included in price ──────────────────
    const isTaxIncluded = (item) => {
      const setting =
        item?.taxes?.setting ||
        item?.taxes ||
        item?.tax_obj?.setting ||
        item?.tax?.setting ||
        item?.product?.taxes?.setting ||
        item?.product?.taxes;

      return setting === "included";
    };

    // ── Subtotal & Taxes Calculation ──────────────────────────────────
    let totalTax = 0;
    let totalDiscount = 0;
    let subTotal = 0;
    const taxDetailsMap = {};

    items.forEach((item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? (item._source === "scale_barcode" ? Number(item._weight_kg || 0) : Number(item.quantity || 1))
        : Number(item.count || item.quantity || 1);

      const itemDiscount = Number(item.discount_val || 0);
      totalDiscount += itemDiscount * qty;

      const itemTax = Number(item.tax_only || 0);
      const extraTax = calculateExtraTax(item);
      const totalItemTax = (itemTax + extraTax) * qty;
      totalTax += totalItemTax;

      // السعر الإجمالي الفعلي للصنف مع إضافاته وكميته
      const itemGrossTotal = parseFloat(
        item.totalPrice !== undefined && item.totalPrice !== null
          ? item.totalPrice
          : (parseFloat(item.price || item.final_price || 0) * (qty || 1))
      );

      // لو الضريبة مشمولة: نطرح الضريبة للحصول على السعر قبل الضريبة (189.08 = 203 - 13.92)
      if (isTaxIncluded(item)) {
        subTotal += Math.max(0, itemGrossTotal - totalItemTax);
      } else {
        subTotal += itemGrossTotal;
      }

      if (totalItemTax > 0 && item.tax_obj) {
        const taxName = item.tax_obj.name || "Tax";
        const taxId = item.tax_obj.id || 'default';

        if (!taxDetailsMap[taxId]) {
          taxDetailsMap[taxId] = {
            name: taxName,
            total: 0,
            amount: item.tax_obj.amount,
            type: item.tax_obj.type,
            setting: isTaxIncluded(item) ? "included" : "excluded",
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

    let amountToPay = subTotal + totalTax + serviceCharge;

    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = items.filter(
        (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
      );

      let selTax = 0;
      let selSub = 0;

      selected.forEach((i) => {
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? (i._source === "scale_barcode" ? Number(i._weight_kg || 0) : Number(i.quantity || 1))
          : Number(i.count || i.quantity || 1);

        const itemTax = Number(i.tax_only || 0);
        const extraTax = calculateExtraTax(i);
        const totalItemTax = (itemTax + extraTax) * qty;
        selTax += totalItemTax;

        const itemGross = parseFloat(
          i.totalPrice !== undefined && i.totalPrice !== null
            ? i.totalPrice
            : (parseFloat(i.price || i.final_price || 0) * (qty || 1))
        );

        if (isTaxIncluded(i)) {
          selSub += Math.max(0, itemGross - totalItemTax);
        } else {
          selSub += itemGross;
        }
      });

      let selSF = applySF
        ? sfType === "precentage"
          ? (selSub + selTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selSub / subTotal : 0)
        : 0;

      amountToPay = selSub + selTax + selSF;
    }

    const doneItems = items.filter((i) => i.preparation_status === "done");
    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems?.length > 0
        ? items.filter((i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done")
        : items;

    return {
      subTotal: Number((subTotal || 0).toFixed(2)),
      totalTax: Number((totalTax || 0).toFixed(2)),
      totalExcludedTax: 0,
      totalDiscount: Number((totalDiscount || 0).toFixed(2)),
      totalOtherCharge: Number((serviceCharge || 0).toFixed(2)),
      totalAmountDisplay: Number((totalBeforeDelivery || 0).toFixed(2)),
      amountToPay: Number((amountToPay || 0).toFixed(2)),
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