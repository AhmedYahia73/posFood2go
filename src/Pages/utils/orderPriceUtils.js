/**
 * calculateItemUnitPrice
 * النسخة المُحدثة - الاعتماد على final_price من الباك إند
 */
export const calculateItemUnitPrice = (baseProduct, selectedVariation = {}, selectedExtras = null) => {
  const isTaxIncluded = 
    baseProduct?.taxes === "included" || 
    baseProduct?.taxes?.setting === "included" || 
    baseProduct?.tax_obj?.setting === "included";

  let finalPrice = isTaxIncluded
    ? parseFloat(baseProduct.final_price || baseProduct.price_after_tax || baseProduct.price || 0)
    : parseFloat(baseProduct.price_after_discount || baseProduct.price || baseProduct.final_price || 0);
  
  // في حالة المنتجات البسيطة بدون variations أو extras، نرجع finalPrice مباشرة
  if ((!baseProduct.variations || baseProduct.variations.length === 0) && 
      (!selectedExtras || selectedExtras.length === 0) &&
      (!baseProduct.addons || baseProduct.addons.length === 0)) {
    return finalPrice;
  }

  // 2. إضافة الـ Extras والـ Addons الخارجية فقط
  let additions = 0;

  if (selectedExtras !== null) {
    // ── المسار 1: استدعاء من المودال مع selectedExtras صريحة ──
    const allPossibleAddons = [
      ...(baseProduct.allExtras || []),
      ...(baseProduct.addons || [])
    ];
    selectedExtras.forEach(id => {
      const extra = allPossibleAddons.find(e => String(e.id) === String(id));
      if (extra) {
        const priceToUse = isTaxIncluded
          ? parseFloat(extra.final_price || extra.price_after_tax || extra.price || 0)
          : parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
        additions += priceToUse;
      }
    });
  } else {
    // ── المسار 2: استدعاء من الـ cart/order (item مخزن) ──

    // أولاً: الـ extras من allExtras (محفوظة كـ IDs في selectedExtras)
    const storedExtras = baseProduct.selectedExtras || [];
    if (storedExtras.length > 0) {
      const allExtrasCatalog = baseProduct.allExtras || [];
      storedExtras.forEach(id => {
        const extra = allExtrasCatalog.find(e => String(e.id) === String(id));
        if (extra) {
          const priceToUse = isTaxIncluded
            ? parseFloat(extra.final_price || extra.price_after_tax || extra.price || 0)
            : parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
          additions += priceToUse;
        }
      });
    }

    // ثانياً: الـ addons المحفوظة على الـ item
    const storedAddons = baseProduct.addons || [];
    storedAddons.forEach(addon => {
      if (addon.addon_id !== undefined) {
        const qty = parseFloat(addon.quantity || addon.count || 1);
        const addonP = isTaxIncluded
          ? parseFloat(addon.final_price || addon.price_after_tax || addon.price || 0)
          : parseFloat(addon.price || addon.price_after_discount || addon.final_price || 0);
        additions += addonP * qty;
      }
    });
  }

  // الإجمالي: final_price من الباك + الإضافات الخارجية فقط
  return finalPrice + additions;
};