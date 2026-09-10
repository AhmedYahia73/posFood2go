// utils/processProductItem.js

/**
 * معالجة عنصر واحد من السلة وتحويله للشكل اللي الـ Backend بيفهمه
 */
export const processProductItem = (item) => {
  if (!item) {
    return {
      product_id: "",
      count: "1",
      note: "",
      price: "0.00",
      variation: [],
      addons: [],
      extra_id: [],
      exclude_id: [],
    };
  }

  // 1. Variations - الهيكل الصحيح مع حماية كاملة من القيم غير المعرفة
  let variations = [];
  const rawVariations = item.variations || item.variation || [];

  if (Array.isArray(rawVariations) && rawVariations.length > 0) {
    variations = rawVariations
      .map((group) => {
        if (!group || typeof group !== "object") return null;

        const variationId = group.variation_id ?? group.id;
        if (variationId === undefined || variationId === null) return null;

        let optionIds = [];
        if (Array.isArray(group.selected_option_id)) {
          optionIds = group.selected_option_id;
        } else if (group.selected_option_id !== undefined && group.selected_option_id !== null) {
          optionIds = [group.selected_option_id];
        } else if (Array.isArray(group.option_id)) {
          optionIds = group.option_id;
        } else if (group.option_id !== undefined && group.option_id !== null) {
          optionIds = [group.option_id];
        } else if (Array.isArray(group.selected_options)) {
          optionIds = group.selected_options.map(opt =>
            typeof opt === "object" && opt !== null ? (opt.option_id ?? opt.id) : opt
          );
        } else if (Array.isArray(group.options)) {
          const selected = group.options.filter(o => o && (o.selected || o.is_selected));
          if (selected.length > 0) {
            optionIds = selected.map(o => o.id);
          }
        }

        const cleanOptionIds = optionIds
          .map(opt => (typeof opt === "object" && opt !== null ? (opt.id ?? opt.option_id) : opt))
          .filter(id => id !== undefined && id !== null && id !== "")
          .map(id => id.toString());

        if (cleanOptionIds.length === 0) return null;

        return {
          variation_id: variationId.toString(),
          option_id: cleanOptionIds,
        };
      })
      .filter(Boolean);
  }

  // Fallback: فحص selectedVariation ككائن { [variation_id]: option_id }
  if (variations.length === 0 && item.selectedVariation && typeof item.selectedVariation === "object") {
    variations = Object.entries(item.selectedVariation)
      .map(([vId, oId]) => {
        if (!vId || oId === undefined || oId === null) return null;

        let rawIds = [];
        if (Array.isArray(oId)) {
          rawIds = oId;
        } else if (typeof oId === "object" && oId !== null) {
          rawIds = [oId.optionId ?? oId.id ?? oId.value];
        } else {
          rawIds = [oId];
        }

        const cleanOptionIds = rawIds
          .map(opt => (typeof opt === "object" && opt !== null ? (opt.optionId ?? opt.id) : opt))
          .filter(id => id !== undefined && id !== null && id !== "")
          .map(id => id.toString());

        if (cleanOptionIds.length === 0) return null;

        return {
          variation_id: vId.toString(),
          option_id: cleanOptionIds,
        };
      })
      .filter(Boolean);
  }

  // 2. Addons - مع الـ price المطلوب وبدون أخطاء toString
  const addons = [];
  const rawAddons = item.addons || [];
  if (Array.isArray(rawAddons)) {
    rawAddons.forEach((addon) => {
      if (!addon) return;
      const addonId = addon.addon_id ?? addon.id;
      const quantity = addon.quantity ?? addon.count ?? 1;
      if (addonId !== undefined && addonId !== null && quantity > 0) {
        let addonPrice = 0;
        const sourceAddon = (item.addons_list || []).find(
          a => a && (a.id ?? a.addon_id) === addonId
        );
        if (sourceAddon) {
          addonPrice = parseFloat(
            sourceAddon.price_after_discount ||
            sourceAddon.price_after_tax ||
            sourceAddon.price ||
            0
          );
        } else if (addon.price !== undefined && addon.price !== null) {
          addonPrice = parseFloat(addon.price || 0);
        }
        addons.push({
          addon_id: addonId.toString(),
          count: quantity.toString(),
          price: isNaN(addonPrice) ? "0.00" : addonPrice.toFixed(2),
        });
      }
    });
  }

  // 3. Extras
  const rawExtras = item.selectedExtras || item.extras || [];
  const extra_id = (Array.isArray(rawExtras) ? rawExtras : [rawExtras])
    .map(extra => (typeof extra === "object" && extra !== null ? (extra.id ?? extra.addon_id) : extra))
    .filter(id => id !== undefined && id !== null && id !== "")
    .filter(id => {
      if (!item.allExtras || !Array.isArray(item.allExtras) || item.allExtras.length === 0) return true;
      return item.allExtras.some(e => e && String(e.id) === String(id));
    })
    .map(id => id.toString());

  // 4. Excludes - تنقية العناصر غير المعرفة قبل استدعاء toString
  const rawExcludes = item.selectedExcludes || item.excludes || [];
  const exclude_id = (Array.isArray(rawExcludes) ? rawExcludes : [rawExcludes])
    .map(ex => (typeof ex === "object" && ex !== null ? (ex.id ?? ex.exclude_id) : ex))
    .filter(id => id !== undefined && id !== null && id !== "")
    .map(id => id.toString());

  const note = item.notes?.trim() || "";

  // 5. ضبط الوزن والكمية
  const finalCount = item.weight_status === 1 || item.weight_status === "1"
    ? (item.quantity ?? item.count ?? 1)
    : (item.count ?? item.quantity ?? 1);
  const countStr = (finalCount ?? 1).toString();

  const productId = (item.product_id ?? item.id ?? "")?.toString();

  // ── Product by Time: send computed price with count=1 ──────────────────────
  if (item.product_time && item.time_ended) {
    const computedPrice = parseFloat(item.totalPrice || 0);
    return {
      product_id: productId,
      count: "1",
      note,
      price: isNaN(computedPrice) ? "0.00" : computedPrice.toFixed(2),
      variation: [],
      addons: [],
      extra_id: [],
      exclude_id: [],
    };
  }

  const rawPrice = parseFloat(
    item.price_after_discount ??
    item.price_after_tax ??
    item.final_price ??
    item.finalPrice ??
    item.price ??
    0
  );

  return {
    product_id: productId,
    count: countStr,
    note,
    price: isNaN(rawPrice) ? "0.00" : rawPrice.toFixed(2),
    variation: variations,
    addons,
    extra_id,
    exclude_id,
  };
};

/**
 * بناء الـ financials payload - مظبوطة للفيزا والباقي
 */
export const buildFinancialsPayload = (paymentSplits = [], financialAccounts = []) => {
  return (paymentSplits || []).map((split) => {
    const account = (financialAccounts || []).find(a => a && a.id === split.accountId);
    const isVisa = account?.name?.toLowerCase().includes("visa");

    const payload = {
      id: (split.accountId ?? "").toString(),
      amount: parseFloat(split.amount || 0).toFixed(2),
    };

    // آخر 4 أرقام (للفيزا أو أي حساب مفعل description_status)
    if (split.checkout?.trim()) {
      payload.description = split.checkout.trim();
    }

    // رقم العملية (Transaction ID / Approval Code)
    if (split.transition_id?.trim()) {
      payload.transition_id = split.transition_id.trim();
    }

    return payload;
  });
};

/**
 * تحديد الـ Endpoint الصحيح
 */
export const getOrderEndpoint = (orderType, orderItems, totalDineInItems, hasDealItems) => {
  if (hasDealItems) return "cashier/deal/add";

  if (orderType === "dine_in") {
    return orderItems.length < totalDineInItems
      ? "cashier/dine_in_split_payment"
      : "cashier/dine_in_payment";
  }

  if (orderType === "delivery") return "cashier/delivery_order";
  return "cashier/take_away_order";
};


/**
 * بناء الـ Payload الأساسي - إضافة service_fee_id
 */
export const buildOrderPayload = ({
  orderType,
  orderItems,
  amountToPay,
  totalTax,
  totalDiscount,
  notes,
  source,
  financialsPayload,
  cashierId,
  tableId,
  customerPaid,
  due = 0,
  user_id,
  discount_id,
  module_id,
  free_discount,
  service_fees, // القيمة المالية (الكمية)
  due_module,
  password,
  repeated = 0,
  prepare_order,
}) => {
  const basePayload = {
    amount: parseFloat(amountToPay || 0).toFixed(2),
    total_tax: parseFloat(totalTax || 0).toFixed(2),
    total_discount: parseFloat(totalDiscount || 0).toFixed(2),
    notes: notes?.trim() || "",
    source,
    financials: financialsPayload || [],
    cashier_id: (cashierId ?? localStorage.getItem("cashier_id") ?? "4").toString(),
    due: (due ?? 0).toString(),
    order_pending: "0",
    prepare_order: prepare_order !== undefined && prepare_order !== null ? prepare_order.toString() : "1",
    ...(repeated === 1 && { repeated: "1" }),
  };

  if (tableId !== undefined && tableId !== null && tableId !== "") {
    basePayload.table_id = tableId.toString();
  }

  // 1. إرسال قيمة مصاريف الخدمة (Amount)
  if (service_fees !== undefined && service_fees !== null) {
    basePayload.service_fees = parseFloat(service_fees).toFixed(2);
  }

  // 🟢 2. إضافة الـ ID الخاص بمصاريف الخدمة من الـ localStorage
  const storedServiceFeeId = localStorage.getItem("service_fee_id");
  if (storedServiceFeeId) {
    basePayload.service_fees_id = storedServiceFeeId.toString();
  }
  // 🆕 3. إضافة module_order_number إذا كان موجود في localStorage
  const storedModuleOrderNumber = localStorage.getItem("module_order_number");
  if (storedModuleOrderNumber) {
    basePayload.module_order_number = storedModuleOrderNumber.trim();
  }
  if (orderType === "dine_in") {
    const storedCaptainId = localStorage.getItem("selected_captain_id");
    if (storedCaptainId) {
      basePayload.captain_id = storedCaptainId.toString();
    }
  }
  // --- بقية الـ Logic كما هو ---
  if (due_module > 0) {
    basePayload.due_module = parseFloat(due_module).toFixed(2);
  }

  if (discount_id) basePayload.discount_id = discount_id.toString();

  if (module_id && module_id !== "all") {
    basePayload.module_id = module_id.toString();
  }

  if (free_discount && free_discount > 0) {
    basePayload.free_discount = free_discount.toString();
    if (password && password.trim()) {
      basePayload.password = password.trim();
    }
  }

  if (due === 1 && user_id) {
    basePayload.user_id = user_id.toString();
  }

  const products = (orderItems || []).filter(Boolean).map(processProductItem).filter(Boolean);

  if (orderType === "dine_in") {
    return {
      ...basePayload,
      table_id: (tableId ?? "").toString(),
      products,
      cart_id: (orderItems || []).map(i => i?.cart_id || i?.temp_id).filter(Boolean),
    };
  }

  if (orderType === "delivery") {
    return {
      ...basePayload,
      products,
      address_id: localStorage.getItem("selected_address_id") || "",
      user_id: localStorage.getItem("selected_user_id") || "",
      cash_with_delivery: customerPaid ? parseFloat(customerPaid).toFixed(2) : "0",
    };
  }

  return {
    ...basePayload,
    products,
  };
};
/**
 * Deal Payload
 */
export const buildDealPayload = (orderItems = [], financialsPayload = []) => {
  const deal = (orderItems || []).find(i => i && i.is_deal) || {};
  return {
    deal_id: (deal.deal_id ?? "").toString(),
    user_id: (deal.deal_user_id ?? "").toString(),
    financials: financialsPayload,
  };
};

/**
 * التحقق من الدفع
 */
export const validatePaymentSplits = (paymentSplits, getDescriptionStatus) => {
  let total = 0;

  for (const split of paymentSplits) {
    const amount = parseFloat(split.amount || 0);
    if (amount <= 0) {
      return { valid: false, error: "Please enter a valid amount" };
    }
    total += amount;

    if (getDescriptionStatus(split.accountId)) {
      if (!split.checkout || split.checkout.length !== 4 || !/^\d{4}$/.test(split.checkout)) {
        return { valid: false, error: "Please enter last 4 digits" };
      }
    }
  }

  return { valid: true, totalPaid: total };
};
/**
 * حساب خصم عنصر واحد (base product/variation فقط، مش الـ addons/extras)
 */

export const calculateItemDiscount = (item) => {
  if (!item) return 0;

  let unitDiscount = 0;

  // 1. حالة الـ Variation: نأخذ قيمة الخصم الخاصة بالاختيار المختار
  const firstVariation = item.variations?.[0];
  const selectedOptId = Array.isArray(firstVariation?.selected_option_id)
    ? firstVariation.selected_option_id[0]
    : firstVariation?.selected_option_id;

  const selectedOption = firstVariation?.options?.find(
    (opt) => String(opt.id) === String(selectedOptId)
  );

  if (selectedOption) {
    unitDiscount = Number(selectedOption.discount_val || 0);
  } else {
    // 2. المنتج العادي: نأخذ قيمة الخصم المباشرة
    unitDiscount = Number(item.discount_val || 0);
  }

  // 3. حساب الكمية (سواء وزن أو عدد)
  const quantity =
    item.weight_status === 1 || item.weight_status === "1"
      ? Number(item.quantity || item.count || 1)
      : Number(item.count || 1);

  // إجمالي الخصم = قيمة الخصم للوحدة * الكمية
  const totalItemDiscount = unitDiscount * quantity;

  return parseFloat(totalItemDiscount.toFixed(2));
};

/**
 * إجمالي خصومات كل المنتجات في السلة
 */
export const calculateTotalItemDiscounts = (orderItems = []) => {
  return orderItems.reduce((sum, item) => sum + calculateItemDiscount(item), 0);
};
