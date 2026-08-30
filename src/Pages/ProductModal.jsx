import { getCurrencySymbol } from '../utils/currency';
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useTranslation } from "react-i18next";
import { calculateItemUnitPrice } from './utils/orderPriceUtils';

// Helper function to calculate total price including variations, extras, and addons
// --- 1. دالة مساعدة لمعرفة هل المتغير هو "حجم" (Size) أم لا ---
const isSizeVariation = (variation) => {
  if (!variation || !variation.name) return false;
  const name = variation.name.toLowerCase();
  // نفحص الكلمات الدلالية للحجم بالعربي والإنجليزي
  return name.includes('size') || name.includes('حجم') || name.includes('maqas') || name.includes('مقاس');
};

// ✅ تحديث دالة المقارنة لتشمل الـ Addons
export const areProductsEqual = (product1, product2) => {
  // 1. فحص الـ ID الأساسي
  if (product1.id !== product2.id) return false;

  // 2. فحص المتغيرات (Variations)
  const vars1 = product1.selectedVariation || {};
  const vars2 = product2.selectedVariation || {};
  if (JSON.stringify(vars1) !== JSON.stringify(vars2)) return false;

  // 3. فحص الملاحظات (Notes)
  if ((product1.notes || "").trim() !== (product2.notes || "").trim()) return false;

  // 4. فحص المحذوفات (Excludes)
  const excl1 = [...(product1.selectedExcludes || [])].sort().join(",");
  const excl2 = [...(product2.selectedExcludes || [])].sort().join(",");
  if (excl1 !== excl2) return false;

  // 5. فحص الإضافات (Extras)
  const ext1 = [...(product1.selectedExtras || [])].sort().join(",");
  const ext2 = [...(product2.selectedExtras || [])].sort().join(",");
  if (ext1 !== ext2) return false;

  // 6. 🔥 الإصلاح المطلوب: فحص الـ Addons
  // نحول الـ addons لشكل نصي مرتب للمقارنة (لأنها مصفوفة أوبجكتات)
  const add1 = JSON.stringify((product1.addons || []).sort((a, b) => a.addon_id - b.addon_id));
  const add2 = JSON.stringify((product2.addons || []).sort((a, b) => a.addon_id - b.addon_id));

  if (add1 !== add2) return false;

  return true;
};

const ProductModal = ({
  isOpen,
  onClose,
  selectedProduct,
  selectedVariation = {},
  selectedExtras = [],
  selectedExcludes = [],
  quantity,
  validationErrors = {},
  hasErrors = false,
  onVariationChange,
  onExtraChange,
  onExtraDecrement,
  onExclusionChange,
  onQuantityChange,
  onAddFromModal,
  orderLoading,
  productType = "piece",
}) => {
  // ✅ State for notes
  const [notes, setNotes] = useState("");
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  if (!selectedProduct) return null;

  const isWeightProduct = productType === "weight" || selectedProduct.weight_status === 1;

  // حساب السعر مع الـ variations
  let basePrice = parseFloat(selectedProduct.final_price || 0);
  let variationPrice = 0;

  // حساب الـ variations
  if (selectedProduct.variations) {
    selectedProduct.variations.forEach((v) => {
      const selected = selectedVariation[v.id];
      if (!selected) return;

      if (v.type === "single") {
        // ✅ الـ single ممكن يبقى شكله { optionId, value } لو كان بالوزن
        const selectedOptionId = typeof selected === "object" ? selected.optionId : selected;
        const opt = v.options.find((o) => String(o.id) === String(selectedOptionId));
        if (opt) {
          const isWeightOption =
            v.weight === 1 || v.weight === "1" || opt.weight === 1 || opt.weight === "1";

          if (isWeightOption) {
            const enteredWeight = typeof selected === "object" ? parseFloat(selected.value) || 0 : 0;
            variationPrice += parseFloat(opt.price || 0) * enteredWeight;
          } else if (opt.total_option_price > 0) {
            basePrice = parseFloat(opt.total_option_price);
          } else {
            variationPrice += parseFloat(opt.final_price || opt.price || 0);
          }
        }
      } else if (v.type === "multiple" && Array.isArray(selected)) {
        selected.forEach((item) => {
          let opt, quantity = 1;

          if (item && typeof item === 'object') {
            opt = v.options.find((o) => String(o.id) === String(item.optionId));
            quantity = item.value || 1;
          } else {
            opt = v.options.find((o) => String(o.id) === String(item));
          }

          if (opt) {
            if (v.weight === 1 || v.weight === "1" || opt.weight === 1 || opt.weight === "1") {
              variationPrice += parseFloat(opt.price || 0) * quantity;
            } else {
              variationPrice += parseFloat(opt.final_price || opt.price_after_tax || opt.price || 0) * quantity;
            }
          }
        });
      }
    });
  }

  const isTaxIncluded = 
    selectedProduct.taxes === "included" || 
    selectedProduct.taxes?.setting === "included" || 
    selectedProduct.tax_obj?.setting === "included";

  // إضافة الـ extras
  let extraPrice = 0;
  selectedExtras.forEach(id => {
    const extra = [...(selectedProduct.allExtras || []), ...(selectedProduct.addons || [])].find(e => String(e.id) === String(id));
    if (extra) {
      const priceToUse = isTaxIncluded
        ? parseFloat(extra.final_price || extra.price_after_tax || extra.price || 0)
        : parseFloat(extra.price || extra.price_after_discount || extra.final_price || 0);
      extraPrice += priceToUse;
    }
  });

  // حساب ضريبة الـ variations
  let baseTax = parseFloat(selectedProduct.tax_only || selectedProduct.tax_val || 0);
  let variationTax = 0;
  
  if (selectedProduct.variations) {
    selectedProduct.variations.forEach((v) => {
      const selected = selectedVariation[v.id];
      if (!selected) return;

      if (v.type === "single") {
        const selectedOptionId = typeof selected === "object" ? selected.optionId : selected;
        const opt = v.options.find((o) => String(o.id) === String(selectedOptionId));
        if (opt) {
          const isWeightOption = v.weight === 1 || v.weight === "1" || opt.weight === 1 || opt.weight === "1";
          if (isWeightOption) {
            const enteredWeight = typeof selected === "object" ? parseFloat(selected.value) || 0 : 0;
            variationTax += parseFloat(opt.tax_val || 0) * enteredWeight;
          } else if (opt.total_option_price > 0) {
            baseTax = parseFloat(opt.tax_val || 0);
          } else {
            variationTax += parseFloat(opt.tax_val || 0);
          }
        }
      } else if (v.type === "multiple" && Array.isArray(selected)) {
        selected.forEach((item) => {
          let opt, quantity = 1;
          if (item && typeof item === 'object') {
            opt = v.options.find((o) => String(o.id) === String(item.optionId));
            quantity = item.value || 1;
          } else {
            opt = v.options.find((o) => String(o.id) === String(item));
          }
          if (opt) {
            variationTax += parseFloat(opt.tax_val || 0) * quantity;
          }
        });
      }
    });
  }

  // إضافة ضريبة الـ extras والـ addons
  let extraTax = 0;
  selectedExtras.forEach(id => {
    const extra = [...(selectedProduct.allExtras || []), ...(selectedProduct.addons || [])].find(e => String(e.id) === String(id));
    if (extra) {
      let taxVal = parseFloat(extra.tax_val || extra.tax_only || 0);
      if (!taxVal && extra.price_after_tax && extra.price) {
        taxVal = Math.max(0, parseFloat(extra.price_after_tax) - parseFloat(extra.price));
      }
      extraTax += taxVal > 0 ? taxVal : 0;
    }
  });

  let unitPrice = 0;
  let totalPrice = 0;
  let unitTax = 0;
  let totalTax = 0;
  const finalQuantity = parseFloat(quantity) || 0;

  if (isWeightProduct) {
    // بالنسبة لمنتجات الوزن: الإضافات والمتغيرات تُحسب قيمتها كإجمالي مستقل ولا تُضرب في كمية المنتج مرة أخرى
    const totalVariationAndExtra = variationPrice + extraPrice;
    totalPrice = (basePrice * finalQuantity) + totalVariationAndExtra;
    unitPrice = finalQuantity > 0 ? (totalPrice / finalQuantity) : basePrice;
    
    const totalVariationAndExtraTax = variationTax + extraTax;
    totalTax = (baseTax * finalQuantity) + totalVariationAndExtraTax;
    unitTax = finalQuantity > 0 ? (totalTax / finalQuantity) : baseTax;
  } else {
    // للمنتجات بالقطعة: المتغيرات والإضافات تطبق على كل قطعة
    unitPrice = basePrice + variationPrice + extraPrice;
    totalPrice = unitPrice * finalQuantity;
    
    unitTax = baseTax + variationTax + extraTax;
    totalTax = unitTax * finalQuantity;
  }

  const hasVariations =
    selectedProduct.variations && selectedProduct.variations.length > 0;
  const hasAddons = selectedProduct.addons && selectedProduct.addons.length > 0;
  const hasExtras =
    selectedProduct.allExtras && selectedProduct.allExtras.length > 0;
  const hasExcludes =
    selectedProduct.excludes && selectedProduct.excludes.length > 0;

  const getExtraCount = (extraId) => {
    return selectedExtras.filter((id) => id === extraId).length;
  };

  const handleExtraIncrement = (extraId) => {
    onExtraChange(extraId);
  };

  const handleExtraDecrement = (extraId) => {
    if (onExtraDecrement && getExtraCount(extraId) > 0) {
      onExtraDecrement(extraId);
    }
  };


  const getVariationOptionDisplay = (option, variation) => {
    let priceToDisplay = 0;

    // إذا كان هناك سعر كلي للخيار، نعرضه كقيمة مطلقة
    if (option.total_option_price > 0 || isSizeVariation(variation)) {
      priceToDisplay = parseFloat(option.total_option_price || option.final_price || 0);
      return `${option.name} (${priceToDisplay.toFixed(2)} ${getCurrencySymbol()})`;
    } else {
      // لو مجرد زيادة (Add-on variation)
      priceToDisplay = parseFloat(option.price ?? 0);
      if (priceToDisplay === 0) return option.name;
      return `${option.name} (+${priceToDisplay.toFixed(2)} ${getCurrencySymbol()})`;
    }
  };

  const handleWeightChange = (e) => {
    const value = e.target.value;
    // بنمرر القيمة زي ما هي (كـ String مؤقتاً) عشان نسمح لليوزر يكتب "0." براحته من غير ما العلامة تتمسح
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      onQuantityChange(value);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {
      setNotes(""); // Clear notes on close
      onClose();
    }}>
      <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-[500px] p-0 rounded-2xl shadow-2xl overflow-y-auto max-h-[90dvh] md:max-h-[90vh] scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex flex-col">
          <div className="relative">
            <img
              src={
                selectedProduct.image_link || "https://via.placeholder.com/400"
              }
              alt={selectedProduct.name}
              className="w-full h-48 object-cover"
            />
            <button
              onClick={() => {
                setNotes("");
                onClose();
              }}
              className="absolute top-4 right-4 text-white bg-black bg-opacity-50 rounded-full p-2 hover:bg-opacity-75 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-4 flex-1">
            <div className="flex justify-between items-center mb-2">
              <DialogTitle className="text-xl font-bold text-gray-800">
                {selectedProduct.name}
              </DialogTitle>
              <span className="text-xl font-semibold text-red-600">
                {totalPrice.toFixed(2)} {getCurrencySymbol()}
              </span>
            </div>
            <DialogDescription className="text-gray-500 text-sm mb-4">
              {selectedProduct.description &&
                selectedProduct.description !== "null"
                ? selectedProduct.description
                : t("Nodescriptionavailable")}
            </DialogDescription>

            {/* Variations section */}
            {hasVariations && (
              <div className="mb-4">
                {selectedProduct.variations.map((variation) => (
                  <div key={variation.id} className="mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2">
                      {variation.name}
                      {variation.required && (
                        <span className="text-red-500 ml-1">*</span>
                      )}
                      {variation.type === "multiple" && (
                        <span className="text-xs text-gray-500 ml-2">
                          ({t("Min")}: {variation.min || 0}, {t("Max")}: {variation.max || "∞"})
                        </span>
                      )}
                    </h4>
                    {validationErrors[variation.id] && (
                      <p className="text-red-500 text-xs mb-2">
                        {validationErrors[variation.id]}
                      </p>
                    )}

                    {/* Single-select variations */}
                    {variation.type === "single" && variation.options && (
                      <div className="flex flex-wrap gap-2">
                        {variation.options.map((option) => {
                          const selectedSingle = selectedVariation[variation.id];
                          const selectedOptionId =
                            typeof selectedSingle === "object" ? selectedSingle?.optionId : selectedSingle;
                          const isSelected = selectedOptionId === option.id;

                          // ✅ نفس فحص isWeightOption المستخدم في الـ multiple
                          const isWeightOption =
                            variation.weight === 1 ||
                            variation.weight === "1" ||
                            option.weight === 1 ||
                            option.weight === "1" ||
                            option.weight === true;

                          const currentWeightValue =
                            isSelected && typeof selectedSingle === "object" ? selectedSingle.value : "";

                          return (
                            <div key={option.id} className="flex flex-col gap-1">
                              <button
                                onClick={() => onVariationChange(variation.id, option.id)}
                                className={`flex flex-col items-center justify-center px-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
            ${isSelected
                                    ? "bg-red-600 text-white border-red-600 scale-105"
                                    : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                                  }`}
                              >
                                <span className="capitalize">
                                  {getVariationOptionDisplay(option, variation)}
                                  {/* عرض وحدة الوزن إذا كانت متوفرة */}
                                  {variation.weight_status === 1 && variation.weight_unit && (
                                    <span className="text-xs text-gray-500 ml-1">
                                      ({variation.weight_unit})
                                    </span>
                                  )}
                                </span>
                                {isWeightOption ? (
                                  <span className="text-xs">
                                    {(option.price || 0).toFixed(2)} {getCurrencySymbol()}/{variation.weight_unit || 'kg'}
                                  </span>
                                ) : (
                                  parseFloat(option.final_price || option.price_after_tax || 0) > 0 && (
                                    <span className="text-xs">
                                      +{(option.final_price || option.price_after_tax).toFixed(2)} {getCurrencySymbol()}
                                    </span>
                                  )
                                )}
                              </button>

                              {/* ✅ حقل إدخال الوزن (عشري) - بيظهر بس لو الخيار ده بالوزن وهو المختار حاليًا */}
                              {isWeightOption && isSelected && (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={currentWeightValue}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                                        if (inputValue === '') {
                                          onVariationChange(variation.id, option.id, "remove");
                                        } else if (
                                          inputValue === '0' ||
                                          inputValue === '0.' ||
                                          inputValue === '.' ||
                                          inputValue.endsWith('.')
                                        ) {
                                          onVariationChange(variation.id, option.id, "set", inputValue);
                                        } else {
                                          const numValue = parseFloat(inputValue);
                                          if (!isNaN(numValue) && numValue > 0) {
                                            onVariationChange(variation.id, option.id, "set", numValue);
                                          } else if (numValue === 0) {
                                            onVariationChange(variation.id, option.id, "remove");
                                          }
                                        }
                                      }
                                    }}
                                    placeholder="0.0"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                  <span className="text-xs text-gray-600 font-medium">
                                    {variation.weight_unit || 'kg'}
                                  </span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Multi-select variations - with counters */}
                    {variation.type === "multiple" && variation.options && (
                      <div className="space-y-3">
                        {variation.options.map((option) => {
                          const selectedOptions = selectedVariation[variation.id] || [];

                          // تحديد إذا كان الـ option بالوزن أم بالقطعة

                          const isWeightOption =
                            variation.weight === 1 ||
                            variation.weight === "1" ||
                            option.weight === 1 ||
                            option.weight === "1" ||
                            option.weight === true;
                          console.log("Option:", option.name, "weight:", option.weight || 0, "isWeightOption:", isWeightOption);
                          // حساب الكمية بناءً على نوع البيانات المحفوظة
                          let optionCount = 0;
                          if (isWeightOption) {
                            const weightOption = selectedOptions.find(opt =>
                              typeof opt === 'object' ? opt.optionId === option.id : opt === option.id
                            );
                            optionCount = weightOption && typeof weightOption === 'object'
                              ? weightOption.value || 0
                              : 0;
                          } else {
                            optionCount = selectedOptions.filter(
                              opt => typeof opt === 'object' ? opt.optionId === option.id : opt === option.id
                            ).length;
                          }

                          const totalSelected = selectedOptions.length;

                          const canDecrease =
                            totalSelected > (variation.min || 0);
                          const canIncrease =
                            !variation.max || totalSelected < variation.max;

                          return (
                            <div
                              key={option.id}
                              className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                            >
                              <div className="flex-1">
                                <span className="text-sm font-medium text-gray-700 capitalize">
                                  {option.name}
                                </span>
                                <div className="text-xs text-gray-500">
                                  {/* عرض السعر بناءً على نوع الخيار */}
                                  {isWeightOption ? (
                                    // للخيارات بالوزن، عرض السعر للكيلو
                                    `${(option.price || 0).toFixed(2)} ${getCurrencySymbol()}/${variation.weight_unit || 'kg'}`
                                  ) : (
                                    // للخيارات بالقطعة، عرض السعر العادي
                                    parseFloat(option.final_price || option.price_after_tax || option.price || 0) === 0
                                      ? "Free"
                                      : `+${(option.final_price || option.price_after_tax || option.price).toFixed(2)} ${getCurrencySymbol()}`
                                  )}
                                </div>
                              </div>

                              {/* عرض input للوزن (بدون أزرار) أو buttons للقطع */}
                              {isWeightOption ? (
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    inputMode="decimal"
                                    value={optionCount > 0 ? optionCount : ''}
                                    onChange={(e) => {
                                      const inputValue = e.target.value;
                                      // السماح بالأرقام العشرية أثناء الكتابة (بما في ذلك "0." و ".5" إلخ)
                                      if (inputValue === '' || /^\d*\.?\d*$/.test(inputValue)) {
                                        // إذا كان الحقل فارغًا، نحذف الـ option
                                        if (inputValue === '') {
                                          onVariationChange(variation.id, option.id, "remove");
                                        }
                                        // إذا كان المستخدم يكتب (حتى لو "0." أو "."), نسمح بذلك مؤقتًا
                                        else if (inputValue === '0' || inputValue === '0.' || inputValue === '.' || inputValue.endsWith('.')) {
                                          // نمرر القيمة مباشرة لتسهيل الكتابة
                                          onVariationChange(variation.id, option.id, "set", inputValue);
                                        }
                                        // إذا كانت قيمة رقمية صحيحة
                                        else {
                                          const numValue = parseFloat(inputValue);
                                          if (!isNaN(numValue) && numValue > 0) {
                                            onVariationChange(variation.id, option.id, "set", numValue);
                                          } else if (numValue === 0) {
                                            // إذا كانت القيمة صفر، نحذف الـ option
                                            onVariationChange(variation.id, option.id, "remove");
                                          }
                                        }
                                      }
                                    }}
                                    placeholder="0.0"
                                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                                  />
                                  <span className="text-xs text-gray-600 font-medium">
                                    {variation.weight_unit || 'kg'}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center space-x-2">
                                  <button
                                    className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                                    onClick={() =>
                                      onVariationChange(
                                        variation.id,
                                        option.id,
                                        "remove"
                                      )
                                    }
                                    disabled={optionCount === 0 || !canDecrease}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <span className="text-sm font-semibold w-8 text-center">
                                    {optionCount}
                                  </span>
                                  <button
                                    className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50"
                                    onClick={() =>
                                      onVariationChange(
                                        variation.id,
                                        option.id,
                                        "add"
                                      )
                                    }
                                    disabled={!canIncrease}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Extras section - with counters */}
            {hasExtras && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t("ExtrasOptional")}
                </h4>
                <div className="space-y-3">
                  {selectedProduct.allExtras.map((extra, index) => {
                    const count = getExtraCount(extra.id);

                    return (
                      <div
                        key={`extra-${index}`}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {extra.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            {(() => {
                              const isIncluded = 
                                selectedProduct.taxes === "included" || 
                                selectedProduct.taxes?.setting === "included" || 
                                selectedProduct.tax_obj?.setting === "included";
                              const displayPrice = isIncluded
                                ? parseFloat(extra.final_price ?? extra.price ?? 0)
                                : parseFloat(extra.price ?? extra.price_after_discount ?? extra.final_price ?? 0);
                              return displayPrice > 0
                                ? `+${displayPrice.toFixed(2)} ${getCurrencySymbol()}`
                                : t("Free");
                            })()}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                            onClick={() => handleExtraDecrement(extra.id)}
                            disabled={count === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">
                            {count}
                          </span>
                          <button
                            className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            onClick={() => handleExtraIncrement(extra.id)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Addons section - with counters */}
            {hasAddons && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-3">
                  {t("AddonsOptional")}
                </h4>
                <div className="space-y-3">
                  {selectedProduct.addons.map((addon, index) => {
                    const count = getExtraCount(addon.id);

                    return (
                      <div
                        key={`addon-${index}`}
                        className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                      >
                        <div className="flex-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">
                            {addon.name}
                          </span>
                          <div className="text-xs text-gray-500">
                            +{(
                              addon.final_price ??
                              addon.price_after_tax ??
                              addon.price_after_discount ??
                              0
                            ).toFixed(2)}{" "}
                            {getCurrencySymbol()}
                            {addon.tax && (
                              <span className="ml-1 text-xs text-gray-400">
                                ({t("inclTax")})
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors disabled:opacity-50"
                            onClick={() => handleExtraDecrement(addon.id)}
                            disabled={count === 0}
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold w-8 text-center">
                            {count}
                          </span>
                          <button
                            className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                            onClick={() => handleExtraIncrement(addon.id)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Excludes section */}
            {hasExcludes && (
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                  {t("ExcludeOptional")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedProduct.excludes.map((item, index) => (
                    <button
                      key={`exclude-${index}`}
                      onClick={() => onExclusionChange(item.id)}
                      className={`flex flex-col items-center justify-center p-2 rounded-lg border-2 text-sm font-medium transition-all duration-200
                        ${selectedExcludes.includes(item.id)
                          ? "bg-red-600 text-white border-red-600 scale-105"
                          : "bg-gray-100 text-gray-700 border-gray-300 hover:border-red-400"
                        }`}
                    >
                      <span className="capitalize line-through">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ✅ Notes Section */}
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-gray-700 mb-2">
                {t("SpecialInstructionsOptional")}
              </h4>
              <Textarea
                placeholder={t("AddSpecialInstructions")}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full min-h-[80px] resize-none"
                maxLength={200}
              />
              <p className="text-xs text-gray-500 mt-1">
                {notes.length}/200 {t("characters")}
              </p>
            </div>
          </div>
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="text-lg font-bold">
                {t("Total")}{" "}
                <span className="text-red-600">
                  {totalPrice.toFixed(2)} {getCurrencySymbol()}
                </span>
              </div>

              {/* Quantity selector - different for weight vs piece */}
              {isWeightProduct ? (
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700">
                    {t("Weight")} (kg):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quantity || ''}
                    onChange={handleWeightChange}
                    placeholder="0.00"
                    className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-semibold focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <button
                    className="bg-gray-200 text-red-600 p-1 rounded-full hover:bg-gray-300 transition-colors"
                    onClick={() => onQuantityChange(Math.max(1, quantity - 1))}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-semibold">{quantity}</span>
                  <button
                    className="bg-red-600 text-white p-1 rounded-full hover:bg-red-700 transition-colors"
                    onClick={() => onQuantityChange(quantity + 1)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </div>
            <Button
              data-enter
              onClick={() => {
                const finalQuantity = parseFloat(quantity) || 0;

                // حساب السعر الإجمالي مع الـ variations والـ extras
                const totalUnitPrice = basePrice + variationPrice + extraPrice;

                const enhancedProduct = {
                  ...selectedProduct,
                  temp_id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                  selectedVariation,
                  selectedExtras: selectedExtras.filter(id =>
                    (selectedProduct.allExtras || []).some(e => e.id === id) ||
                    (selectedProduct.addons || []).some(a => a.id === id)
                  ),
                  selectedExcludes: selectedExcludes || [],
                  quantity: finalQuantity,
                  notes: notes.trim(),

                  // استخدام final_price من الباك إند
                  price: unitPrice,
                  modalCalculatedPrice: unitPrice,
                  originalPrice: selectedProduct.final_price,
                  totalPrice: totalPrice,

                  // إضافة discount_val و tax_only بشكل صريح
                  discount_val: parseFloat(selectedProduct.discount_val || 0),
                  tax_only: unitTax,

                  // نحفظ الـ catalog الكامل للـ addons عشان نقدر نسترجعه لاحقاً
                  addons_list: selectedProduct.addons_list || selectedProduct.addons || [],

                  // باقي الحقول كما هي...
                  addons: (selectedExtras.filter(id => (selectedProduct.addons || []).some(a => a.id === id))).map(addonId => {
                    const src = (selectedProduct.addons || []).find(a => a.id === addonId);
                    return { addon_id: addonId, quantity: 1, price: src ? parseFloat(src.final_price || src.price || 0) : 0 };
                  }),
                  variations: (selectedProduct.variations || []).map(group => {
                    const selectedValue = selectedVariation[group.id];

                    if (group.type === "single") {
                      // ✅ الـ single ممكن يبقى شكله { optionId, value } لو كان بالوزن
                      const isObjectValue = selectedValue && typeof selectedValue === "object";
                      const selectedOptionId = isObjectValue ? selectedValue.optionId : selectedValue;
                      const selectedOption = group.options?.find(opt => opt.id === selectedOptionId);
                      const isWeight =
                        group.weight === 1 || group.weight === "1" ||
                        selectedOption?.weight === 1 || selectedOption?.weight === "1";

                      return {
                        ...group,
                        selected_option_id: selectedOptionId || null,
                        ...(isWeight && {
                          quantity: parseFloat(isObjectValue ? selectedValue.value : 0) || 0,
                          is_weight: true
                        })
                      };
                    } else if (group.type === "multiple") {
                      const selectedOptions = selectedValue || [];
                      return {
                        ...group,
                        selected_options: selectedOptions.map(item => {
                          if (item && typeof item === 'object') {
                            // للمتغيرات بالوزن
                            const option = group.options.find(opt => opt.id === item.optionId);
                            return {
                              option_id: item.optionId,
                              quantity: item.value || 1,
                              is_weight: (group.weight === 1 || group.weight === "1" || option?.weight === 1 || option?.weight === "1") ? true : false
                            };
                          } else {
                            // للمتغيرات العادية
                            return {
                              option_id: item,
                              quantity: 1,
                              is_weight: false
                            };
                          }
                        })
                      };
                    }

                    return group;
                  }),
                };

                onAddFromModal(enhancedProduct, { isFromModal: true, checkDuplicate: true });
                setNotes("");
                onClose();
              }}
              disabled={orderLoading || hasErrors || (isWeightProduct && (!quantity || parseFloat(quantity) <= 0))}
              className="w-full"
            >
              {orderLoading ? t("Adding") : t("AddtoCart")}
            </Button>

          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductModal;