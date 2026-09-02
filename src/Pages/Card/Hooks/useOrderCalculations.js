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
          const addonP = isIncluded
            ? parseFloat(addon.final_price || addon.price_after_tax || addon.price || 0)
            : parseFloat(addon.price || addon.price_after_discount || addon.final_price || 0);
          extraPrice += addonP * addonQty;
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
              const optPrice = parseFloat(optionData.final_price || optionData.price || optionData.additional_price || 0);
              extraPrice += (optPrice * opt.weight); // مثال: 65 * 1.75 = 113.75
            }
          });
        });
      }

      return extraPrice;
    };

    // --- دالة مساعدة لحساب ضرائب جميع الإضافات ---
    const calculateExtraTax = (item) => {
      let extraTax = 0;
      const isItemTaxInc = isTaxIncluded(item);
      const productTax = item.tax || item.tax_obj;

      // 1. حساب ضريبة الـ extras والـ addons من selectedExtras
      const selectedExtras = item.selectedExtras || [];
      const allExtrasCatalog = [
        ...(item.allExtras || []),
        ...(item.addons || []),
        ...(item.addons_list || []),
        ...(item.all_addons || [])
      ];

      if (selectedExtras.length > 0) {
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => String(e.id || e.addon_id) === String(id));
          if (extra) {
            let taxVal = parseFloat(extra.tax_val || extra.tax_only || 0);
            if (!taxVal && extra.price_after_tax && extra.price) {
              taxVal = Math.max(0, parseFloat(extra.price_after_tax) - parseFloat(extra.price));
            }
            if (!taxVal && productTax && !isItemTaxInc) {
              const extraBasePrice = parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
              if (productTax.type === 'precentage' || productTax.type === 'percentage') {
                taxVal = (extraBasePrice * parseFloat(productTax.amount || 0)) / 100;
              } else if (productTax.type === 'value') {
                taxVal = parseFloat(productTax.amount || 0);
              }
            }
            extraTax += taxVal > 0 ? taxVal : 0;
          }
        });
      }

      // 2. حساب ضريبة الـ addons إذا كانت مخزنة في item.addons
      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        const addonId = addon.addon_id;
        if (addonId === undefined) return;
        const alreadyCountedInSelected = selectedExtras.some(id => String(id) === String(addonId));
        if (!alreadyCountedInSelected) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          let addonTax = parseFloat(addon.tax_val || addon.tax_only || 0);
          if (!addonTax && productTax && !isItemTaxInc) {
            const baseP = parseFloat(addon.price || 0);
            if (productTax.type === 'precentage' || productTax.type === 'percentage') {
              addonTax = (baseP * parseFloat(productTax.amount || 0)) / 100;
            }
          }
          extraTax += addonTax * addonQty;
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
              let optTax = parseFloat(optionData.tax_val || optionData.tax_only || 0);
              if (!optTax && optionData.price_after_tax && optionData.price) {
                optTax = Math.max(0, parseFloat(optionData.price_after_tax) - parseFloat(optionData.price));
              }
              if (!optTax && productTax && !isItemTaxInc) {
                const optBasePrice = parseFloat(optionData.price || optionData.after_disount || optionData.final_price || 0);
                if (productTax.type === 'precentage' || productTax.type === 'percentage') {
                  optTax = (optBasePrice * parseFloat(productTax.amount || 0)) / 100;
                }
              }
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
    let totalTaxIncluded = 0;
    let totalTaxExcluded = 0;
    let totalDiscount = 0;
    let subTotal = 0;
    const taxDetailsMap = {};

    const addTaxToMap = (taxObj, amount, isIncluded) => {
      if (!taxObj || amount <= 0) return;
      const taxId = taxObj.id || taxObj.name || 'default';
      if (!taxDetailsMap[taxId]) {
        taxDetailsMap[taxId] = {
          name: taxObj.name || "Tax",
          total: 0,
          amount: taxObj.amount,
          type: taxObj.type,
          setting: isIncluded ? "included" : "excluded",
        };
      }
      taxDetailsMap[taxId].total += amount;
    };

    items.forEach((item) => {
      const qty = (item.weight_status === 1 || item.weight_status === "1")
        ? (item._source === "scale_barcode" ? Number(item._weight_kg || 0) : Number(item.quantity || 1))
        : Number(item.count || item.quantity || 1);

      const itemDiscount = Number(item.discount_val || 0);
      totalDiscount += itemDiscount * qty;

      const isItemTaxInc = isTaxIncluded(item);
      const productTax = item.tax_obj || item.tax || item.product?.tax_obj || item.product?.tax;
      const allExtrasCatalog = [
        ...(item.allExtras || []),
        ...(item.addons || []),
        ...(item.addons_list || []),
        ...(item.all_addons || [])
      ];

      // ── Product by Time: use pre-computed totalPrice ───────────────────────
      if (item.product_time) {
        if (item.time_ended && item.totalPrice != null) {
          const computed = parseFloat(item.totalPrice || 0);
          subTotal += computed;

          if (productTax) {
            let timeTax = 0;
            const rate = parseFloat(productTax.amount || 0);
            if (productTax.type === 'precentage' || productTax.type === 'percentage') {
              timeTax = isItemTaxInc
                ? (computed - (computed / (1 + rate / 100)))
                : (computed * rate) / 100;
            } else if (productTax.type === 'value') {
              timeTax = rate;
            }
            if (isItemTaxInc) {
              totalTaxIncluded += timeTax;
            } else {
              totalTaxExcluded += timeTax;
            }
            addTaxToMap(productTax, timeTax, isItemTaxInc);
          } else {
            const fallbackTax = parseFloat(item.tax_only || item.tax_val || 0);
            if (isItemTaxInc) {
              totalTaxIncluded += fallbackTax;
            } else {
              totalTaxExcluded += fallbackTax;
            }
          }
        }
        return;
      }

      // 1. حساب السعر الأساسي للمنتج (مع الخيار الأساسي إن وجد)
      let itemBasePrice = isItemTaxInc
        ? parseFloat(item.final_price || item.price_after_tax || item.price || 0)
        : parseFloat(item.price_after_discount || item.price || item.final_price || 0);

      let itemBaseTax = 0;

      // حساب الـ variations
      let variationAddonsPrice = 0;
      let variationAddonsTax = 0;
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
              if (optionData.total_option_price > 0 && variationGroup.type === 'single') {
                itemBasePrice = parseFloat(optionData.total_option_price);
              } else {
                const optP = isItemTaxInc
                  ? parseFloat(optionData.final_price || optionData.price_after_tax || optionData.price || 0)
                  : parseFloat(optionData.price || optionData.after_disount || optionData.final_price || 0);
                variationAddonsPrice += optP * opt.weight;

                let optT = parseFloat(optionData.tax_val || optionData.tax_only || 0);
                if (!optT && productTax) {
                  if (productTax.type === 'precentage' || productTax.type === 'percentage') {
                    optT = isItemTaxInc
                      ? (optP - (optP / (1 + (parseFloat(productTax.amount) / 100))))
                      : (optP * parseFloat(productTax.amount)) / 100;
                  }
                }
                variationAddonsTax += optT * opt.weight;
              }
            }
          });
        });
      }

      // حساب ضريبة المنتج الأساسي
      if (productTax) {
        if (productTax.type === 'precentage' || productTax.type === 'percentage') {
          const rate = parseFloat(productTax.amount || 0);
          itemBaseTax = isItemTaxInc
            ? (itemBasePrice - (itemBasePrice / (1 + (rate / 100))))
            : (itemBasePrice * rate) / 100;
        } else if (productTax.type === 'value') {
          itemBaseTax = parseFloat(productTax.amount || 0);
        }
      } else {
        itemBaseTax = parseFloat(item.tax_only || item.tax_val || 0);
      }

      const totalBaseAndVarTax = (itemBaseTax + variationAddonsTax) * qty;
      if (isItemTaxInc) {
        totalTaxIncluded += totalBaseAndVarTax;
      } else {
        totalTaxExcluded += totalBaseAndVarTax;
      }
      addTaxToMap(productTax, totalBaseAndVarTax, isItemTaxInc);

      // 2. حساب الـ Extras من selectedExtras
      let extrasTotalPrice = 0;
      let extrasTotalTax = 0;
      const selectedExtras = item.selectedExtras || [];
      if (selectedExtras.length > 0) {
        selectedExtras.forEach(id => {
          const extra = allExtrasCatalog.find(e => String(e.id || e.addon_id) === String(id));
          if (extra) {
            const extraP = isItemTaxInc
              ? parseFloat(extra.final_price || extra.price_after_tax || extra.price || 0)
              : parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
            extrasTotalPrice += extraP;

            const extraTaxObj = extra.tax || extra.tax_obj || productTax;
            let extraT = parseFloat(extra.tax_val || extra.tax_only || 0);
            if (!extraT && extraTaxObj) {
              if (extraTaxObj.type === 'precentage' || extraTaxObj.type === 'percentage') {
                const rate = parseFloat(extraTaxObj.amount || 0);
                extraT = isItemTaxInc
                  ? (extraP - (extraP / (1 + (rate / 100))))
                  : (extraP * rate) / 100;
              } else if (extraTaxObj.type === 'value') {
                extraT = parseFloat(extraTaxObj.amount || 0);
              }
            }
            extrasTotalTax += extraT;
            if (isItemTaxInc) {
              totalTaxIncluded += extraT * qty;
            } else {
              totalTaxExcluded += extraT * qty;
            }
            addTaxToMap(extraTaxObj, extraT * qty, isItemTaxInc);
          }
        });
      }

      // 3. حساب الـ Addons من item.addons
      let addonsTotalPrice = 0;
      let addonsTotalTax = 0;
      const storedAddons = item.addons || [];
      storedAddons.forEach(addon => {
        const addonId = addon.addon_id;
        if (addonId === undefined) return;
        const alreadyInSelected = selectedExtras.some(id => String(id) === String(addonId));
        if (!alreadyInSelected) {
          const addonQty = parseFloat(addon.quantity || addon.count || 1);
          const addonP = isItemTaxInc
            ? parseFloat(addon.final_price || addon.price_after_tax || addon.price || 0)
            : parseFloat(addon.price || addon.price_after_discount || addon.final_price || 0);
          addonsTotalPrice += addonP * addonQty;

          const catalogAddon = allExtrasCatalog.find(e => String(e.id || e.addon_id) === String(addonId));
          const addonTaxObj = addon.tax || addon.tax_obj || catalogAddon?.tax || catalogAddon?.tax_obj || productTax;
          let addonT = parseFloat(addon.tax_val || addon.tax_only || catalogAddon?.tax_val || catalogAddon?.tax_only || 0);
          if (!addonT && addonTaxObj) {
            if (addonTaxObj.type === 'precentage' || addonTaxObj.type === 'percentage') {
              const rate = parseFloat(addonTaxObj.amount || 0);
              addonT = isItemTaxInc
                ? (addonP - (addonP / (1 + (rate / 100))))
                : (addonP * rate) / 100;
            } else if (addonTaxObj.type === 'value') {
              addonT = parseFloat(addonTaxObj.amount || 0);
            }
          }
          addonsTotalTax += addonT * addonQty;
          if (isItemTaxInc) {
            totalTaxIncluded += addonT * addonQty * qty;
          } else {
            totalTaxExcluded += addonT * addonQty * qty;
          }
          addTaxToMap(addonTaxObj, addonT * addonQty * qty, isItemTaxInc);
        }
      });

      // السعر الإجمالي الفعلي للصنف مع إضافاته وكميته
      const itemGrossTotal = itemBasePrice + variationAddonsPrice + extrasTotalPrice + addonsTotalPrice;
      subTotal += itemGrossTotal * qty;
    });

    // تقريب وإجمالي الضرائب
    totalTax = totalTaxIncluded + totalTaxExcluded;
    totalTax = Math.round(totalTax * 100) / 100;
    subTotal = Math.round(subTotal * 100) / 100;

    const taxDetails = Object.values(taxDetailsMap);

    // ── Service Fee (dine_in / take_away) ─────────────────────────────
    const sfAmt = serviceFeeData?.amount ?? 0;
    const sfType = serviceFeeData?.type ?? "precentage";
    const applySF = ["dine_in", "take_away"].includes(orderType) && sfAmt > 0;

    const serviceCharge = applySF
      ? sfType === "precentage"
        ? (subTotal + totalTaxExcluded) * (sfAmt / 100)
        : sfAmt
      : 0;

    // ── Totals ─────────────────────────────────────────────────────────
    // إذا كانت الضريبة مشمولة (included)، فإن subTotal يحتوي عليها مسبقاً ولا تضاف مرة أخرى
    const totalBeforeDelivery = subTotal + totalTaxExcluded + serviceCharge;

    let amountToPay = subTotal + totalTaxExcluded + serviceCharge;

    if (orderType === "delivery") {
      amountToPay += Number(deliveryFee);
    }

    if (orderType === "dine_in" && selectedPaymentItems?.length > 0) {
      const selected = items.filter(
        (i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done"
      );

      let selExcludedTax = 0;
      let selGross = 0;

      selected.forEach((i) => {
        const qty = (i.weight_status === 1 || i.weight_status === "1")
          ? (i._source === "scale_barcode" ? Number(i._weight_kg || 0) : Number(i.quantity || 1))
          : Number(i.count || i.quantity || 1);

        const isInc = isTaxIncluded(i);
        const itemTax = Number(i.tax_only || 0);
        const extraTax = calculateExtraTax(i);
        const totalItemTax = (itemTax + extraTax) * qty;

        const itemGross = parseFloat(
          i.totalPrice !== undefined && i.totalPrice !== null
            ? i.totalPrice
            : (parseFloat(i.price || i.final_price || 0) * (qty || 1))
        );

        selGross += itemGross;
        if (!isInc) {
          selExcludedTax += totalItemTax;
        }
      });

      let selSF = applySF
        ? sfType === "precentage"
          ? (selGross + selExcludedTax) * (sfAmt / 100)
          : serviceCharge * (subTotal > 0 ? selGross / subTotal : 0)
        : 0;

      amountToPay = selGross + selExcludedTax + selSF;
    }

    const doneItems = items.filter((i) => i.preparation_status === "done");
    const checkoutItems =
      orderType === "dine_in" && selectedPaymentItems?.length > 0
        ? items.filter((i) => selectedPaymentItems.includes(i.temp_id) && i.preparation_status === "done")
        : items;

    return {
      subTotal: Number((subTotal || 0).toFixed(2)),
      totalTax: Number((totalTax || 0).toFixed(2)),
      totalTaxIncluded: Number((totalTaxIncluded || 0).toFixed(2)),
      totalExcludedTax: Number((totalTaxExcluded || 0).toFixed(2)),
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
