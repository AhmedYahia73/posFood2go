// src/services/productProcessor.js

export const buildProductPayload = (item) => {
  // 1. تجميع الـ Variations
  // أضفنا حماية للتأكد من أن oId موجود قبل عمل toString
  const groupedVariations = Object.entries(item?.selectedVariation || {}).map(([vId, oId]) => ({
    variation_id: vId?.toString(),
    option_id: Array.isArray(oId) 
      ? oId.filter(id => id !== undefined).map(id => id?.toString()) 
      : (oId ? [oId.toString()] : [])
  }));

  // 2. الـ Addons
  // أضفنا حماية للتأكد من أن addon_id موجود (هذا هو السطر 13 المسبب للخطأ)
  const addonItems = (item?.addons || [])
    .filter(addon => addon && addon.addon_id) // نتجاهل أي إضافة ليس لها ID
    .map(addon => ({
      addon_id: addon.addon_id?.toString(),
      count: (addon.quantity || addon.count || 1)?.toString(),
      price: (addon.price || 0)?.toString()
    }));

  // 3. الـ Extras
  const extraIds = (item?.selectedExtras || [])
    .filter(id => id !== undefined)
    .map(id => id?.toString());

  // 4. بناء الـ Payload النهائي
  return {
    product_id: item?.id?.toString() || "",
    count: (item?.quantity || item?.count || 1)?.toString(),
    note: (item?.notes || "").trim() || "No special instructions",
    price: (item?.price || 0)?.toString(), 
    addons: addonItems,
    variation: groupedVariations,
    exclude_id: (item?.selectedExcludes || []).filter(id => id !== undefined).map(id => id?.toString()),
    extra_id: extraIds,
  };
};