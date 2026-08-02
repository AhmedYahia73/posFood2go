/**
 * calculateItemUnitPrice
 * النسخة المُحدثة - الاعتماد على final_price من الباك إند
 */
export const calculateItemUnitPrice = (baseProduct, selectedVariation = {}, selectedExtras = null) => {
  // 1. استخدام final_price مباشرة من الباك إند (يشمل كل الحسابات)
  let finalPrice = parseFloat(baseProduct.final_price || 0);
  
  // في حالة المنتجات البسيطة بدون variations أو extras، نرجع final_price مباشرة
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
      const extra = allPossibleAddons.find(e => e.id === parseInt(id));
      if (extra) {
        // استخدام final_price للـ extra إذا كان متوفراً
        additions += parseFloat(extra.final_price || extra.price || 0);
      }
    });
  } else {
    // ── المسار 2: استدعاء من الـ cart/order (item مخزن) ──

    // أولاً: الـ extras من allExtras (محفوظة كـ IDs في selectedExtras)
    const storedExtras = baseProduct.selectedExtras || [];
    if (storedExtras.length > 0) {
      const allExtrasCatalog = baseProduct.allExtras || [];
      storedExtras.forEach(id => {
        const extra = allExtrasCatalog.find(e => e.id === parseInt(id));
        if (extra) {
          additions += parseFloat(extra.final_price || extra.price || 0);
        }
      });
    }

    // ثانياً: الـ addons المحفوظة على الـ item
    const storedAddons = baseProduct.addons || [];
    storedAddons.forEach(addon => {
      if (addon.addon_id !== undefined) {
        const qty = parseFloat(addon.quantity || addon.count || 1);
        additions += parseFloat(addon.price || 0) * qty;
      }
    });
  }

  // الإجمالي: final_price من الباك + الإضافات الخارجية فقط
  return finalPrice + additions;
};