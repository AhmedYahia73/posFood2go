import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { usePost } from "@/Hooks/usePost";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Loading from "@/components/Loading";
import { toast } from "react-toastify";
import { useDeliveryUser } from "@/Hooks/useDeliveryUser";
import { useProductModal } from "@/Hooks/useProductModal";
import DeliveryInfo from "./Delivery/DeliveryInfo";
import ProductCard from "./ProductCard";
import ProductModal from "./ProductModal";
import { useTranslation } from "react-i18next";
import { buildProductPayload } from "@/services/productProcessor";
import { processProductItem } from "./Checkout/processProductItem";
import ModuleOrderModal from "./ModuleOrderModal";
import GroupSelector from "./GroupSelector";

const API_BASE_URL = (window.API_BASE_URL || import.meta.env.VITE_API_BASE_URL);
const getAuthToken = () => localStorage.getItem("token");
let resturant_logo = localStorage.getItem("resturant_logo");

const apiFetcher = async (path) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
  return res.json();
};

const apiPoster = async (path, body) => {
  const url = `${API_BASE_URL}${path}`;
  const token = getAuthToken();
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Failed to post ${url}: ${res.statusText}`);
  return res.json();
};

const INITIAL_PRODUCT_ROWS = 2;
const PRODUCTS_PER_ROW = 4;
const PRODUCTS_TO_SHOW_INITIALLY = INITIAL_PRODUCT_ROWS * PRODUCTS_PER_ROW;

export default function Item({ onAddToOrder, onClose, onClearCart, cartHasItems, orderItems, updateOrderItems }) {
  const [selectedMainCategory, setSelectedMainCategory] = useState("favorite");
  const [selectedSubCategory, setSelectedSubCategory] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [visibleProductCount, setVisibleProductCount] = useState(PRODUCTS_TO_SHOW_INITIALLY);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [branchIdState, setBranchIdState] = useState(localStorage.getItem("branch_id"));
  const [productType, setProductType] = useState("piece");
  const [selectedGroup, setSelectedGroup] = useState("none");
  const [showCategories, setShowCategories] = useState(true);
  const [isNormalPrice, setIsNormalPrice] = useState(true);
  const [isModuleOrderModalOpen, setIsModuleOrderModalOpen] = useState(false);
  const [tempGroupId, setTempGroupId] = useState(null);
  const [moduleOrderNumber, setModuleOrderNumber] = useState("");
  const [selectedGroupInfo, setSelectedGroupInfo] = useState(null);
  const { t, i18n } = useTranslation();
  const scrollRef = useRef(null);
  const [showClearModal, setShowClearModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const scannerInputRef = useRef(null);
  const [viewMode, setViewMode] = useState("grid");

  const {
    selectedProduct,
    isProductModalOpen,
    selectedVariation,
    selectedExtras,
    selectedExcludes,
    quantity,
    totalPrice,
    openProductModal,
    closeProductModal,
    handleVariationChange,
    handleExtraChange,
    handleExclusionChange,
    setQuantity,
    handleExtraDecrement,
  } = useProductModal();

  useEffect(() => {
    const input = scannerInputRef.current;
    if (!input) return;

    // تركيز أولي
    input.focus();

    const handleBlur = (e) => {
      // 1. لا تعيد التركيز إذا كان هناك مودال مفتوح
      if (isProductModalOpen || isModuleOrderModalOpen) return;

      // 2. لا تعيد التركيز إذا كان العنصر الجديد الذي تم الضغط عليه هو حقل إدخال (Input)
      if (
        e.relatedTarget &&
        (e.relatedTarget.tagName === "INPUT" || e.relatedTarget.tagName === "SELECT")
      ) {
        return;
      }

      // 3. انتظر قليلاً ثم تأكد أن المستخدم لم ينتقل لحقل آخر قبل إعادة التركيز
      setTimeout(() => {
        if (
          !isProductModalOpen &&
          !isModuleOrderModalOpen &&
          document.activeElement.tagName !== "INPUT" &&
          document.activeElement.tagName !== "SELECT"
        ) {
          input.focus();
        }
      }, 150);
    };

    input.addEventListener("blur", handleBlur);
    return () => input.removeEventListener("blur", handleBlur);
  }, [isProductModalOpen, isModuleOrderModalOpen]);

  const orderType = localStorage.getItem("order_type") || "dine_in";
  const { deliveryUserData, userLoading, userError } = useDeliveryUser(orderType);
  const { postData: postOrder, loading: orderLoading } = usePost();

  useEffect(() => {
    const stored_branch_id = localStorage.getItem("branch_id");
    if (stored_branch_id !== branchIdState) setBranchIdState(stored_branch_id);
  }, [branchIdState]);

  // 1. جلب المجموعات
  const groupEndpoint = branchIdState ? `cashier/group_product` : null;
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ["groupProducts", branchIdState],
    queryFn: () => apiFetcher(groupEndpoint),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });
  const groupProducts = useMemo(() => groupData?.group_product || [], [groupData]);

  // 🟢 المزامنة المؤكدة بين الـ state والـ localStorage عشان ما يحصلش تعارض (زى ظهور الفيزا فالـ Normal)
  useEffect(() => {
    if (isNormalPrice || selectedGroup === "none" || selectedGroup === "all") {
      localStorage.removeItem("last_selected_group");
    } else if (selectedGroup) {
      localStorage.setItem("last_selected_group", selectedGroup);
    }
  }, [isNormalPrice, selectedGroup]);


  // ── Debounced search state ──────────────────────────────────────────────
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset to category view when switching to grid mode
  useEffect(() => {
    if (viewMode === "grid") {
      setSelectedMainCategory("all");
      setSelectedSubCategory(null);
    }
  }, [viewMode]);

  const { data: categoriesData, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories", branchIdState, i18n.language],
    queryFn: () => apiFetcher(`captain/categories?branch_id=${branchIdState}&locale=${i18n.language}`),
    enabled: !!branchIdState,
    staleTime: 5 * 60 * 1000,
  });
  const finalCategories = useMemo(() => categoriesData?.categories || [], [categoriesData]);

  const { data: offersDataRes, isLoading: offersLoading } = useQuery({
    queryKey: ["offersData", i18n.language, orderType],
    queryFn: () => apiFetcher(`captain/offers?locale=${i18n.language}&module=${orderType}`),
    staleTime: 0,
    gcTime: 0,
  });

  const currentOffers = useMemo(() => {
    return offersDataRes?.offers || [];
  }, [offersDataRes]);

  // ── Query 2: Favourite Products (always loaded) ─────────────────────────
  const { data: favouriteData, isLoading: favouriteLoading } = useQuery({
    queryKey: ["favouriteProducts", branchIdState, i18n.language, orderType],
    queryFn: () => apiFetcher(`captain/favourite_products?branch_id=${branchIdState}&locale=${i18n.language}&module=${orderType}`),
    enabled: !!branchIdState,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
  });
  const favouriteProducts = useMemo(() => {
    if (!favouriteData) return [];
    return productType === "weight"
      ? favouriteData.favourite_products_weight || []
      : favouriteData.favourite_products || [];
  }, [favouriteData, productType]);

  // ── Query 3: Category / All Products (on demand) ────────────────────────
  const isSpecificCategory = selectedMainCategory !== "all" && selectedMainCategory !== "favorite";
  const categoryProductsKey = isSpecificCategory ? selectedMainCategory : "_all_";
  const categoryProductsUrl = useMemo(() => {
    const base = `captain/products?branch_id=${branchIdState}&locale=${i18n.language}&module=${orderType}`;
    return isSpecificCategory ? `${base}&category_id=${selectedMainCategory}` : base;
  }, [branchIdState, i18n.language, orderType, selectedMainCategory, isSpecificCategory]);

  const { data: categoryProductsData, isLoading: categoryProductsLoading } = useQuery({
    queryKey: ["categoryProducts", branchIdState, i18n.language, orderType, categoryProductsKey],
    queryFn: () => apiFetcher(categoryProductsUrl),
    enabled: !!branchIdState && (isSpecificCategory || (viewMode === "sidebar" && selectedMainCategory === "all")),
    staleTime: 0,
    gcTime: 0,
  });
  const allProducts = useMemo(() => {
    if (!categoryProductsData) return [];
    return productType === "weight"
      ? categoryProductsData.products_weight || []
      : categoryProductsData.products || [];
  }, [categoryProductsData, productType]);

  // ── Query 4: Backend Search (debounced onChange) ────────────────────────
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ["searchProducts", branchIdState, i18n.language, orderType, debouncedSearch, productType],
    queryFn: () => apiFetcher(`captain/search_products?branch_id=${branchIdState}&locale=${i18n.language}&module=${orderType}&search=${encodeURIComponent(debouncedSearch)}`),
    enabled: !!branchIdState && debouncedSearch.trim().length >= 1,
    staleTime: 0,
  });
  const searchResults = useMemo(() => {
    if (!searchData) return [];
    return productType === "weight"
      ? searchData.products_weight || []
      : searchData.products || [];
  }, [searchData, productType]);

  const allSubCategories = useMemo(() => {
    return finalCategories.flatMap((cat) =>
      (cat.sub_categories || []).map((sub) => ({
        ...sub,
        main_category_id: cat.id,
        main_category_name: cat.name,
      }))
    );
  }, [finalCategories]);

  // ── Filtering Logic ─────────────────────────────────────────────────────
  const filteredProducts = useMemo(() => {
    if (debouncedSearch.trim()) return searchResults;
    if (selectedMainCategory === "favorite" || selectedGroup === "all") {
      return favouriteProducts;
    }
    let products = allProducts;
    if (selectedSubCategory) {
      products = products.filter((p) => p.sub_category_id === parseInt(selectedSubCategory));
    }
    return products;
  }, [
    debouncedSearch,
    searchResults,
    selectedMainCategory,
    selectedSubCategory,
    favouriteProducts,
    allProducts,
    isNormalPrice,
    selectedGroup,
  ]);

  const productsToDisplay = filteredProducts.slice(0, visibleProductCount);


  const handleCategorySelect = (categoryId, isSub = false) => {
    const idStr = categoryId.toString();
    if (isSub) {
      setSelectedSubCategory(idStr);
    } else {
      setSelectedMainCategory(idStr);
      setSelectedSubCategory(null);
      setSelectedOffer(null);
      setShowCategories(false);
      setVisibleProductCount(PRODUCTS_TO_SHOW_INITIALLY);

      if (selectedGroup === "all") {
        setIsNormalPrice(true);
        setSelectedGroup("none");
      }
    }
  };

  const handleNormalPricesClick = () => {
    setIsNormalPrice(true);
    setSelectedGroup("none");
    setShowCategories(true);
    setSelectedMainCategory("all");
    setSelectedSubCategory(null);
    localStorage.removeItem("module_order_number");
    localStorage.removeItem("last_selected_group"); // 🟢 عشان isDueModuleAllowed في CheckOut يتصفر
    setShowClearModal(false);
  };

  const handleGroupChange = (groupId) => {
    setIsNormalPrice(false);
    const id = groupId.toString();
    setSelectedGroup(id);
    setTempGroupId(id);
    setModuleOrderNumber(localStorage.getItem("module_order_number") || "");
    setIsModuleOrderModalOpen(true);
  };
  const handleAddToOrder = useCallback(
    async (product, options = {}) => {
      const { customQuantity = 1 } = options;

      // 1. تأمين قراءة الكمية كـ Float (عشان 0.75 ما تتحولش لـ 0)
      // نستخدم parseFloat ونضع قيمة افتراضية 1
      const finalQuantity = parseFloat(product.quantity || product.count || customQuantity || 1);;

      const isTaxIncluded = 
        product.taxes === "included" || 
        product.taxes?.setting === "included" || 
        product.tax_obj?.setting === "included";
      const basePrice = isTaxIncluded
        ? parseFloat(product.final_price || product.price_after_tax || product.price || 0)
        : parseFloat(product.price_after_discount || product.price || product.final_price || 0);
      const hasRequiredVariations = product.variations?.some(v => v.required === 1 || v.type === "single");
      const isWeightProduct = productType === "weight" || product.is_weight === 1;

      // التعديل هنا: بنضيف شرط !options.isFromModal 
      // عشان لو جاي من المودال ميفضلش يفتح المودال في loop
      if (!options.isFromModal && (hasRequiredVariations || isWeightProduct)) {
        openProductModal(product);
        return;
      }
      let pricePerUnit = product.totalPrice
        ? parseFloat(product.totalPrice) / finalQuantity
        : basePrice;

      if (!isNormalPrice && selectedGroup && selectedGroup !== "none" && selectedGroup !== "all") {
        try {
          const pPayload = buildProductPayload(product, options, isWeightProduct, orderType);
          const payload = {
            branch_id: branchIdState,
            group_id: selectedGroup,
            products: [{
              id: pPayload.product_id || product.product_id || product.id,
              extras: pPayload.extra_id || [],
              addons: pPayload.addons || [],
              variations: (pPayload.variation || []).map(v => ({
                id: v.variation_id,
                options: v.option_id
              }))
            }]
          };
          const response = await apiPoster("cashier/group_product/group_lists", payload);
          const resProducts = response?.data?.products_items || response?.products_items || response?.data?.products || response?.products || response?.data || response?.success?.products || response || [];
          let arrayToMap = [];
          if (Array.isArray(resProducts)) arrayToMap = resProducts;
          else if (Array.isArray(resProducts.products)) arrayToMap = resProducts.products;

          if (arrayToMap.length > 0) {
            const matchedProduct = arrayToMap[0];
            const finalGroupPrice = parseFloat(matchedProduct.final_price || matchedProduct.price_after_discount || matchedProduct.price || matchedProduct.price_after_tax || 0);
            if (finalGroupPrice > 0) {
              pricePerUnit = finalGroupPrice;

              const originalMatchedPrice = parseFloat(matchedProduct.price || 0);
              product.final_price = finalGroupPrice;
              product.price_after_discount = finalGroupPrice;
              product.price = originalMatchedPrice > 0 ? originalMatchedPrice : finalGroupPrice;
              // Set discount_val so ItemRow.jsx calculates the correct strike-through original price
              product.discount_val = originalMatchedPrice > finalGroupPrice ? originalMatchedPrice - finalGroupPrice : 0;
              
              // Set tax_only from group pricing response if available
              product.tax_only = parseFloat(matchedProduct.tax_only || matchedProduct.tax_val || 0);

              // التحديث عشان لو كان المودال حاسب totalPrice قبل كده
              product.totalPrice = finalGroupPrice * finalQuantity;

              // 🔴 مسح أسعار الإضافات والأحجام لأن الباك إند رجع السعر الـ Absolute الشامل لكل حاجة
              product.is_group_priced = true;
              if (product.variations) {
                product.variations = product.variations.map(v => ({
                  ...v,
                  options: v.options?.map(o => ({ ...o, price: 0, final_price: 0, price_after_tax: 0, price_after_discount: 0, total_option_price: 0 }))
                }));
              }
              if (product.addons) {
                product.addons = product.addons.map(a => ({
                  ...a, price: 0, final_price: 0, price_after_tax: 0, price_after_discount: 0,
                  options: a.options?.map(o => ({ ...o, price: 0, price_after_discount: 0 }))
                }));
              }
              if (product.allExtras) {
                product.allExtras = product.allExtras.map(e => ({
                  ...e, price: 0, final_price: 0, price_after_tax: 0
                }));
              }
            }
          }
        } catch (e) {
          console.error("Failed to fetch group price for added item:", e);
        }
      }

      const totalAmount = pricePerUnit * finalQuantity;

      if (isNaN(totalAmount) || totalAmount <= 0) {
        console.error("❌ Error calculating price", { product, pricePerUnit, finalQuantity });
        return toast.error(t("ErrorCalculatingPrice"));
      }

      // 3. بناء الـ Payload مع التأكد من إرسال أرقام صحيحة
      const processedItem = buildProductPayload({
        ...product,
        price: pricePerUnit,
        count: finalQuantity, // نرسلها كما هي كـ Float
      });

      const createTempId = (pId) => `${pId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (orderType === "dine_in") {
        const tableId = localStorage.getItem("table_id");
        if (!tableId) return toast.error(t("PleaseSelectTableFirst"));

        // ✅ تنظيف الـ module_id - لو "none" أو "all" يبقى null
        const moduleIdToSend = (selectedGroup && selectedGroup !== "none" && selectedGroup !== "all") 
          ? selectedGroup 
          : null;

        const payload = {
          table_id: tableId,
          cashier_id: localStorage.getItem("cashier_id"),
          amount: product.product_time ? "0.00" : totalAmount.toFixed(2),
          // تأمين حساب الضريبة
          total_tax: product.product_time ? "0.00" : (parseFloat(product.tax_only || 0) * finalQuantity).toFixed(2),
          total_discount: "0.00",
          source: "web",
          products: [processedItem],
          ...(moduleIdToSend && { module_id: moduleIdToSend }), // ✅ بس لو في module_id حقيقي
          ...(product.product_time && { time_start: Date.now().toString(), time_end: null }),
        };

        try {
          const response = await postOrder("cashier/dine_in_order", payload, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("access_token")}`,
            },
          });

          const serverCartId = response?.data?.cart_id || response?.cart_id;

          onAddToOrder({
            ...product,
            temp_id: createTempId(product.id),
            cart_id: serverCartId,
            count: finalQuantity,
            quantity: finalQuantity, // نأكد وجود الاثنين لضمان التوافق
            price: pricePerUnit,
            totalPrice: product.product_time ? 0 : totalAmount,
            // إضافة discount_val و tax_only بشكل صريح
            discount_val: parseFloat(product.discount_val || 0),
            tax_only: parseFloat(product.tax_only || 0),
            ...(product.product_time && {
              time_start: Date.now(),
              time_ended: false,
              elapsed_minutes: 0,
            }),
          });
          toast.success(t("ProductAddedToTable"));

        } catch (err) {
          console.error("❌ API Error:", err);
          toast.error(t("FailedToAddToTable"));
        }

      } else {
        // Takeaway / Delivery - نضيف للكارت محلياً (localStorage)
        
        // ✅ نضيف المنتج للكارت مباشرة بالبيانات اللي عندنا
        onAddToOrder({
          ...product,
          temp_id: createTempId(product.id),
          count: finalQuantity,
          quantity: finalQuantity,
          price: pricePerUnit,
          totalPrice: totalAmount,
          // ✅ إضافة discount_val و tax_only بشكل صريح
          discount_val: parseFloat(product.discount_val || 0),
          tax_only: parseFloat(product.tax_only || 0),
        });
        toast.success(t("ProductAddedToCart"));
      }
    },
    [orderType, onAddToOrder, postOrder, t, selectedGroup, productType, openProductModal]// أضيفي selectedGroup هنا للمراقبة
  );

  const isAllDataLoading = categoriesLoading || favouriteLoading;
  if (groupLoading || isAllDataLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loading />
      </div>
    );
  }
  const parseWeightBarcode = (barcode) => {
    // التأكد إن الباركود 13 رقم ويبدأ بـ رقم 2
    if (barcode.length === 13 && barcode.startsWith("2")) {
      const productCode = barcode.substring(1, 7); // استخراج "000601"
      const weightPart = barcode.substring(7, 12); // استخراج "00250"
      const weight = parseFloat(weightPart) / 1000; // تحويله لـ 0.250 كجم

      return { productCode, weight, isWeightBarcode: true };
    }
    return { productCode: barcode, weight: 1, isWeightBarcode: false };
  };

  const handleKeyDown = async (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const query = e.target.value.trim().toLowerCase();
      if (!query) return;

      const { productCode, weight, isWeightBarcode } = parseWeightBarcode(query);
      const numericProductCode = parseInt(productCode, 10).toString();
      const searchTerm = isWeightBarcode ? productCode : query;

      try {
        const result = await apiFetcher(
          `captain/search_products?branch_id=${branchIdState}&locale=${i18n.language}&module=${orderType}&search=${encodeURIComponent(searchTerm)}`
        );
        const products = productType === "weight"
          ? result?.products_weight || []
          : result?.products || [];

        if (products.length >= 1) {
          const exactMatch = products.find((p) => {
            const code = p.product_code?.toString().toLowerCase();
            const barcode = p.barcode?.toString().toLowerCase();
            return (
              code === query ||
              barcode === query ||
              (isWeightBarcode && (
                code === productCode || code === numericProductCode ||
                barcode === productCode || barcode === numericProductCode
              ))
            );
          }) || products[0];

          if (isWeightBarcode) {
            handleAddToOrder(exactMatch, { customQuantity: weight });
            toast.success(t("ProductAddedFromBarcode") || `تم إضافة ${weight} كجم بنجاح`);
          } else {
            if (exactMatch.weight_status === 1 || exactMatch.variations?.length > 0) {
              openProductModal(exactMatch);
            } else {
              handleAddToOrder(exactMatch);
              toast.success(t("ProductAddedFromBarcode") || "تم إضافة المنتج بنجاح");
            }
          }
          setSearchQuery("");
        } else {
          toast.error(t("NoProductFound") || "لم يتم العثور على المنتج");
          setSearchQuery("");
        }
      } catch (err) {
        console.error("Barcode search error:", err);
        toast.error(t("NoProductFound") || "لم يتم العثور على المنتج");
        setSearchQuery("");
      }
    }
  };



  const isArabic = i18n.language === "ar";

  const searchAndToggleSection = (
    <div className="sticky top-0 bg-white z-8 border-b border-gray-100 shadow-sm p-3">
      <div className="flex flex-col md:flex-row items-center gap-3">
        {/* 1. اللوجو والـ Select (اختيار المجموعة) */}
        <GroupSelector
          selectedGroup={selectedGroup}
          isNormalPrice={isNormalPrice}
          groupProducts={groupProducts}
          resturantLogo={resturant_logo}
          onSelectGroup={(groupId, groupInfo) => {
            setTempGroupId(groupId);
            setModuleOrderNumber(localStorage.getItem("module_order_number") || "");
            setSelectedGroupInfo(groupInfo);
            setIsModuleOrderModalOpen(true);
          }}
          onSelectNormalPrice={handleNormalPricesClick}
        />

        {/* 2. حقل البحث - أخد مساحة أكبر */}
        <div className="flex-1 w-full relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder={t("SearchByProductName")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={scannerInputRef}
            className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-1 focus:ring-bg-primary transition-all"
          />
        </div>


        {/* 3. By Piece / By Weight */}
        <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 flex-shrink-0">
          <button
            onClick={() => setProductType("piece")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${productType === "piece" ? "bg-white shadow text-bg-primary" : "text-gray-500"
              }`}
          >
            {t("ByPiece")}
          </button>
          <button
            onClick={() => setProductType("weight")}
            className={`px-4 py-1.5 rounded-lg text-[11px] font-bold transition-all ${productType === "weight" ? "bg-white shadow text-bg-primary" : "text-gray-500"
              }`}
          >
            {t("ByWeight")}
          </button>
        </div>
      </div>
    </div>
  );

  const groupsBarSection = (
    <div className={`flex gap-3 overflow-x-auto p-4 scrollbar-hide items-center`}>
      {/* Normal Prices */}
      <Button
        onClick={handleNormalPricesClick}
        className={`group relative min-w-[100px] h-20 flex flex-col items-center justify-center rounded-xl border overflow-hidden p-0 transition-all duration-300 ${isNormalPrice ? "border-bg-primary ring-2 ring-bg-primary/50" : "border-gray-200"
          }`}
      >
        <div
          className={`absolute inset-0 transition-opacity duration-300 ${isNormalPrice ? "opacity-100" : "opacity-40 group-hover:opacity-100"
            }`}
        >
          <img src={resturant_logo} alt="logo" className="w-full h-full object-cover" />
        </div>
      </Button>

      <div className="h-10 w-[2px] bg-gray-300 mx-1 flex-shrink-0 rounded-full" />

      {groupProducts.map((group) => {
        const isActive = selectedGroup === group.id.toString() && !isNormalPrice;

        return (
          <Button
            key={group.id}
            onClick={() => {
              setTempGroupId(group.id);
              setModuleOrderNumber(localStorage.getItem("module_order_number") || "");
              setSelectedGroupInfo({
                name: group.name,
                image: group.icon_link || "/default-group.png",
              });
              setIsModuleOrderModalOpen(true);
            }}
            className={`group relative min-w-[100px] h-20 flex flex-col items-center justify-center rounded-xl border overflow-hidden p-0 transition-all duration-300 ${isActive ? "border-bg-primary ring-2 ring-bg-primary/50" : "border-gray-200"
              }`}
          >
            <div
              className={`absolute inset-0 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-40 group-hover:opacity-100"
                }`}
            >
              <img
                src={group.icon_link || "/default-group.png"}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            </div>
          </Button>
        );
      })}
    </div>
  );

  const productsGridSection = (
    <div
      className="flex-1 h-[calc(100vh-250px)] md:h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-width-none [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {searchAndToggleSection}
      {filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <span className="text-5xl mb-4">🔍</span>
          <p className="text-lg font-medium">{t("No_products_found")}</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2">
            {productsToDisplay.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToOrder={handleAddToOrder}
                onOpenModal={openProductModal}
                orderLoading={orderLoading}
              />
            ))}
          </div>
          {visibleProductCount < filteredProducts.length && (
            <div className="flex justify-center mt-8 pb-8">
              <Button
                onClick={() => setVisibleProductCount((prev) => prev + 10)}
                className="bg-bg-primary text-white px-10 rounded-full shadow-md hover:opacity-90 transition-opacity"
              >
                {t("Load_More")}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );

  const offersGridSection = (
    <div
      className="flex-1 h-[calc(100vh-250px)] md:h-[calc(100vh-120px)] overflow-y-auto pr-2 scrollbar-width-none [&::-webkit-scrollbar]:hidden"
      dir={isArabic ? "rtl" : "ltr"}
    >
      {searchAndToggleSection}
      {selectedOffer ? (
        <div className="p-4">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setSelectedOffer(null)}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors flex items-center gap-2 text-bg-primary font-bold"
            >
              {isArabic ? "➡️ عودة" : "⬅️ Back"}
            </button>
            <h2 className="text-xl font-bold">{selectedOffer.name}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {selectedOffer.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onAddToOrder={handleAddToOrder}
                onOpenModal={openProductModal}
                orderLoading={orderLoading}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
          {currentOffers.map((offer, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedOffer(offer)}
              className="bg-white border-2 border-transparent hover:border-bg-primary rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden group relative"
            >
              <div className="relative h-56 overflow-hidden">
                <img
                  src={offer.products[0]?.image_link || "/placeholder.png"}
                  alt={offer.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
                <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-1.5 rounded-2xl text-sm font-black shadow-xl transform group-hover:scale-110 transition-transform">
                  {offer.discount}% {t("OFF")}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                <h3 className="font-black text-xl mb-1 drop-shadow-lg">{offer.name}</h3>
                <p className="text-sm font-medium opacity-90">
                  {offer.products.length} {t("Products")}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const scroll = (direction) => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      if (direction === "up") {
        scrollRef.current.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      } else if (direction === "down") {
        scrollRef.current.scrollBy({ top: scrollAmount, behavior: "smooth" });
      } else if (direction === "left") {
        scrollRef.current.scrollBy({ left: -scrollAmount, behavior: "smooth" });
      } else if (direction === "right") {
        scrollRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
      }
    }
  };

  const viewModeToggles = (
    <div className="flex gap-2 p-2  mb-2 bg-gray-50 rounded-lg border border-gray-100">
      <Button
        variant={viewMode === 'sidebar' ? 'default' : 'outline'}
        onClick={() => setViewMode('sidebar')}
        className="flex-1 h-8 text-[10px]"
      >
        الشكل الحالي
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'outline'}
        onClick={() => setViewMode('grid')}
        className="flex-1 h-8 text-[10px]"
      >
        عرض شبكي
      </Button>
    </div>
  );

  const categoriesSection = (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="lg:w-45 w-full lg:sticky lg:top-4 bg-white z-10 lg:h-[calc(100vh-120px)] flex flex-col gap-2"
    >
      <div className="flex items-center justify-between px-2 mb-1">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          {t("Categories")}
        </h4>
        <div className="hidden lg:flex items-center gap-1">
          <button
            onClick={() => scroll("up")}
            className="p-1 rounded-full hover:bg-bg-primary hover:text-white text-gray-400 transition-colors border border-gray-100 shadow-sm"
            title="Scroll Up"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={() => scroll("down")}
            className="p-1 rounded-full hover:bg-bg-primary hover:text-white text-gray-400 transition-colors border border-gray-100 shadow-sm"
            title="Scroll Down"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex lg:flex-col overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 gap-2 scrollbar-hide scroll-smooth"
      >
        {currentOffers.length > 0 && (
          <div
            onClick={() => {
              setSelectedMainCategory("offers");
              setSelectedSubCategory(null);
              setSelectedOffer(null);
              setShowCategories(false);
              if (selectedGroup === "all") {
                setIsNormalPrice(true);
                setSelectedGroup("none");
              }
            }}
            className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl cursor-pointer transition-all border shrink-0 min-w-[120px] lg:min-w-0 ${selectedMainCategory === "offers"
              ? "bg-bg-primary text-white border-bg-primary shadow-md"
              : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
              }`}
          >
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center text-base lg:text-lg">
              🎁
            </div>
            <span className="font-bold text-xs lg:text-sm whitespace-nowrap">{t("Offers")}</span>
          </div>
        )}

        <div
          onClick={() => {
            setIsNormalPrice(false);
            if (selectedGroup === "none") {
              setSelectedGroup("all");
            }
            setSelectedMainCategory("favorite");
            setSelectedSubCategory(null);
            setSelectedOffer(null);
          }}
          className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-3 rounded-xl cursor-pointer transition-all border shrink-0 min-w-[120px] lg:min-w-0 ${(selectedGroup === "all" || selectedMainCategory === "favorite") && !isNormalPrice
            ? "bg-bg-primary text-white border-bg-primary shadow-md"
            : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
            }`}
        >
          <div className="w-8 h-8 lg:w-10 lg:h-10 bg-white/20 rounded-lg flex items-center justify-center text-base lg:text-lg">
            ❤️
          </div>
          <span className="font-bold text-xs lg:text-sm whitespace-nowrap">{t("Favorite")}</span>
        </div>

        {finalCategories.map((cat) => {
          const isMainSelected = selectedMainCategory === cat.id.toString();
          const hasSubCategories = (cat.sub_categories?.length || 0) > 0;

          return (
            <div key={cat.id} className="flex lg:flex-col gap-1 shrink-0 lg:shrink">
              <div
                onClick={() => handleCategorySelect(cat.id)}
                className={`flex items-center gap-2 lg:gap-3 p-2 lg:p-2 rounded-xl cursor-pointer transition-all border min-w-[140px] lg:min-w-0 ${isMainSelected && !selectedSubCategory
                  ? "bg-bg-primary text-white border-bg-primary shadow-md"
                  : "bg-white text-gray-700 border-gray-100 hover:border-red-200"
                  }`}
              >
                <img
                  src={cat.image_link}
                  alt={cat.name}
                  className="w-8 h-8 lg:w-12 lg:h-12 rounded-lg object-cover shadow-sm"
                />
                <span className="font-bold text-xs lg:text-sm truncate flex-1">{cat.name}</span>
              </div>

              {isMainSelected && hasSubCategories && (
                <div className="hidden lg:flex flex-col mr-4 space-y-1 mt-1 border-r-2 border-bg-primary/20 pr-2">
                  {cat.sub_categories.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCategorySelect(sub.id, true);
                      }}
                      className={`p-2 rounded-lg cursor-pointer transition-all border text-center ${selectedSubCategory === sub.id.toString()
                        ? "bg-bg-primary/80 text-white border-bg-primary"
                        : "bg-white text-gray-600 border-gray-100 hover:bg-gray-50"
                        }`}
                    >
                      <span className="text-xs font-medium truncate">{sub.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  const categoriesGrid = (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-4 p-4">
      {finalCategories.map((cat) => {
        const subCount = cat.sub_categories?.length || 0;
        return (
          <div
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className="group relative flex flex-col bg-white rounded-2xl border-2 border-gray-100 hover:border-bg-primary hover:shadow-2xl transition-all duration-300 cursor-pointer overflow-hidden"
          >
            {/* Category Image */}
            <div className="relative h-32 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
              <img
                src={cat.image_link}
                alt={cat.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              {subCount > 0 && (
                <div className="absolute top-2 right-2 bg-bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                  {subCount} {isArabic ? 'قسم' : 'sub'}
                </div>
              )}
            </div>
            {/* Category Name */}
            <div className="p-3 text-center">
              <span className="font-bold text-sm text-gray-800 group-hover:text-bg-primary transition-colors leading-tight block">
                {cat.name}
              </span>
              {subCount > 0 && (
                <p className="text-[10px] text-gray-400 mt-0.5">{subCount} {isArabic ? 'تصنيف فرعي' : 'subcategories'}</p>
              )}
            </div>
            {/* Hover Arrow Indicator */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-bg-primary scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
          </div>
        );
      })}
    </div>
  );
  const handleSaveModuleOrder = async () => {
    const id = tempGroupId?.toString();
    const groupNum = moduleOrderNumber.trim();
    const branchId = branchIdState;

    setIsNormalPrice(false);
    localStorage.setItem("module_order_number", groupNum);
    localStorage.setItem("last_selected_group", id);
    setSelectedGroup(id);
    setShowCategories(true);
    setSelectedMainCategory("all");
    setSelectedSubCategory(null);
    setIsModuleOrderModalOpen(false);
    setTempGroupId(null);
    setModuleOrderNumber("");

    // Fetch new prices for cart items specifically
    if (cartHasItems && orderItems && orderItems.length > 0) {
      try {
        const payload = {
          branch_id: branchId,
          group_id: id,
          products: orderItems.map((item) => {
            const processed = processProductItem(item);
            return {
              id: processed.product_id || item.product_id || item.id,
              extras: processed.extra_id || [],
              addons: processed.addons || [],
              variations: (processed.variation || []).map(v => ({
                id: v.variation_id,
                options: v.option_id
              }))
            };
          })
        };
        const response = await apiPoster("cashier/group_product/group_lists", payload);

        const resProducts = response?.data?.products_items || response?.products_items || response?.data?.products || response?.products || response?.data || response?.success?.products || response || [];
        const updatedProductsMap = new Map();

        let arrayToMap = [];
        if (Array.isArray(resProducts)) arrayToMap = resProducts;
        else if (Array.isArray(resProducts.products)) arrayToMap = resProducts.products;

        arrayToMap.forEach(p => {
          updatedProductsMap.set(p.id?.toString(), p);
          if (p.product_id) updatedProductsMap.set(p.product_id?.toString(), p);
        });

        const newlyPricedCart = orderItems.map(item => {
          const pIdStr = (item.product_id || item.id)?.toString();
          const matchedProduct = updatedProductsMap.get(pIdStr);
          if (matchedProduct) {
            const finalPrice = parseFloat(matchedProduct.final_price || matchedProduct.price_after_discount || matchedProduct.price || item.price || 0);
            const originalMatchedPrice = parseFloat(matchedProduct.price || 0);
            const finalQuantity = parseFloat(item.quantity || item.count || 1);
            const newTotalPrice = finalPrice * finalQuantity;

            return {
              ...item,
              price: originalMatchedPrice > 0 ? originalMatchedPrice : finalPrice, // Base price
              final_price: finalPrice,        // Crucial for ItemRow
              price_after_discount: finalPrice,
              discount_val: originalMatchedPrice > finalPrice ? originalMatchedPrice - finalPrice : 0, // Calculates strike-through
              totalPrice: newTotalPrice,
              originalPrice: originalMatchedPrice || finalPrice,
              module_id: id,
              is_group_priced: true,
              variations: item.variations?.map(v => ({
                ...v,
                options: v.options?.map(o => ({ ...o, price: 0, final_price: 0, price_after_tax: 0, price_after_discount: 0, total_option_price: 0 }))
              })),
              addons: item.addons?.map(a => ({
                ...a, price: 0, final_price: 0, price_after_tax: 0, price_after_discount: 0,
                options: a.options?.map(o => ({ ...o, price: 0, price_after_discount: 0 }))
              })),
              allExtras: item.allExtras?.map(e => ({
                ...e, price: 0, final_price: 0, price_after_tax: 0
              }))
            };
          }
          return item;
        });

        if (updateOrderItems) {
          updateOrderItems(newlyPricedCart);
        }
      } catch (error) {
        console.error("Failed to update cart prices", error);
        toast.error(t("FailedToUpdatePrices") || "فشل تحديث الأسعار بالسلة");
      }
    }

    toast.success(t("ModuleOrderNumberSaved") || "تم حفظ رقم الطلب بنجاح");
    setShowClearModal(false);
  };

return (
    <div className={`flex flex-col h-full ${isArabic ? "text-right" : "text-left"}`} dir={isArabic ? "ltr" : "rtl"}>
      <DeliveryInfo
        orderType={orderType}
        deliveryUserData={deliveryUserData}
        userLoading={userLoading}
        userError={userError}
        onClose={onClose}
      />
      
      <div className="w-full px-2 flex flex-col gap-2">
        {/* أزرار التبديل وشريط البحث دائمًا في الأعلى بشكل منظم ومتناسق */}
        <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
          <div className="flex-1 w-full">
            {searchAndToggleSection}
          </div>
          <div className="w-full md:w-auto min-w-[200px] flex-shrink-0">
            {viewModeToggles}
          </div>
        </div>

        {/* 1. إذا كان وضع الـ Sidebar (الشكل الحالي) */}
        {viewMode === 'sidebar' && (
          <div className="flex flex-col lg:flex-row gap-4 items-start w-full mt-2">
            {/* عرض المنتجات فقط بدون تكرار شريط البحث */}
            <div className="w-full lg:w-[85%]">
              {filteredProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <span className="text-5xl mb-4">🔍</span>
                  <p className="text-lg font-medium">{t("No_products_found")}</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2 h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide">
                    {productsToDisplay.map((product) => (
                      <ProductCard
                        key={product.id}
                        product={product}
                        onAddToOrder={handleAddToOrder}
                        onOpenModal={openProductModal}
                        orderLoading={orderLoading}
                      />
                    ))}
                  </div>
                  {visibleProductCount < filteredProducts.length && (
                    <div className="flex justify-center mt-4 pb-4">
                      <Button
                        onClick={() => setVisibleProductCount((prev) => prev + 10)}
                        className="bg-bg-primary text-white px-10 rounded-full shadow-md hover:opacity-90 transition-opacity"
                      >
                        {t("Load_More")}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* عمود التصنيفات الجانبي */}
            <div className="w-full lg:w-[15%]">
              {categoriesSection}
            </div>
          </div>
        )}

        {/* 2. عرض شبكي - Categories → SubCategories → Products */}
        {viewMode === 'grid' && (
          <div className="w-full flex flex-col gap-2 mt-2">

            {/* ── Search Results (when backend search is active) ── */}
            {debouncedSearch.trim() ? (
              <div className="h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide p-2">
                {searchLoading ? (
                  <div className="flex justify-center py-20"><Loading /></div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <span className="text-5xl mb-4">🔍</span>
                    <p className="text-lg font-medium">{t("No_products_found")}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    {filteredProducts.map((product) => (
                      <ProductCard key={product.id} product={product} onAddToOrder={handleAddToOrder} onOpenModal={openProductModal} orderLoading={orderLoading} />
                    ))}
                  </div>
                )}
              </div>
            ) : selectedMainCategory === "all" ? (
              /* ── Level 1: Categories Grid ── */
              <div className="h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide">
                {categoriesGrid}
              </div>
            ) : selectedMainCategory === "favorite" ? (
              /* ── Favourite Products ── */
              <div className="h-[calc(100vh-260px)] overflow-y-auto scrollbar-hide p-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                  {favouriteProducts.map((product) => (
                    <ProductCard key={product.id} product={product} onAddToOrder={handleAddToOrder} onOpenModal={openProductModal} orderLoading={orderLoading} />
                  ))}
                </div>
              </div>
            ) : (
              /* ── Level 2: Category Selected → Show SubCategories (if any) then Products ── */
              <div className="flex flex-col">
                {/* Breadcrumb + Back button */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <Button
                    onClick={() => { setSelectedMainCategory("all"); setSelectedSubCategory(null); }}
                    className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 h-8 px-3 text-xs rounded-xl"
                  >
                    <span>{isArabic ? "⬅️" : "⬅️"}</span>
                    <span>{isArabic ? "التصنيفات" : "Categories"}</span>
                  </Button>
                  {selectedSubCategory && (
                    <Button
                      onClick={() => setSelectedSubCategory(null)}
                      className="flex items-center gap-1 bg-gray-100 text-gray-700 hover:bg-gray-200 h-8 px-3 text-xs rounded-xl"
                    >
                      <span>{isArabic ? "⬅️ الأقسام" : "⬅️ Sections"}</span>
                    </Button>
                  )}
                  {/* Current Category Name */}
                  <span className="text-sm font-bold text-bg-primary">
                    {finalCategories.find(c => c.id.toString() === selectedMainCategory)?.name || ""}
                  </span>
                </div>

                {/* SubCategories Filter Chips (if category has subs and no sub selected yet) */}
                {!selectedSubCategory && (() => {
                  const currentCat = finalCategories.find(c => c.id.toString() === selectedMainCategory);
                  const subs = currentCat?.sub_categories || [];
                  return subs.length > 0 ? (
                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-2">
                      {subs.map(sub => (
                        <button
                          key={sub.id}
                          onClick={() => setSelectedSubCategory(sub.id.toString())}
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border-2 border-bg-primary/20 hover:border-bg-primary hover:bg-bg-primary/5 text-gray-700 transition-all whitespace-nowrap"
                        >
                          {sub.image_link && <img src={sub.image_link} alt={sub.name} className="w-5 h-5 rounded-full object-cover" />}
                          <span>{sub.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : null;
                })()}

                {/* Products Grid */}
                <div className="h-[calc(100vh-340px)] overflow-y-auto scrollbar-hide">
                  {categoryProductsLoading ? (
                    <div className="flex justify-center py-20"><Loading /></div>
                  ) : filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                      <span className="text-5xl mb-4">📦</span>
                      <p className="text-lg font-medium">{t("No_products_found")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-1">
                      {productsToDisplay.map((product) => (
                        <ProductCard key={product.id} product={product} onAddToOrder={handleAddToOrder} onOpenModal={openProductModal} orderLoading={orderLoading} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* المودالات والإضافات (كما هي بدون تغيير) */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={closeProductModal}
        selectedProduct={selectedProduct}
        selectedVariation={selectedVariation}
        selectedExtras={selectedExtras}
        selectedExcludes={selectedExcludes}
        quantity={quantity}
        totalPrice={totalPrice}
        onVariationChange={handleVariationChange}
        onExtraChange={handleExtraChange}
        onExclusionChange={handleExclusionChange}
        onExtraDecrement={handleExtraDecrement}
        onQuantityChange={setQuantity}
        onAddFromModal={handleAddToOrder}
        orderLoading={orderLoading}
        productType={productType}
      />
      
      {orderLoading && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100]">
          <Loading />
        </div>
      )}
      
      <ModuleOrderModal
        isOpen={isModuleOrderModalOpen}
        onClose={() => {
          setIsModuleOrderModalOpen(false);
          setTempGroupId(null);
          setModuleOrderNumber("");
          setSelectedGroupInfo(null);
        }}
        moduleOrderNumber={moduleOrderNumber}
        setModuleOrderNumber={setModuleOrderNumber}
        onSave={handleSaveModuleOrder}
        groupImage={selectedGroupInfo?.image}
        groupName={selectedGroupInfo?.name}
      />
      
      {showClearModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden transform transition-all scale-100">
            <div className="p-6 text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">{t("Attention") || "تنبيه"}</h3>
              <p className="text-sm text-gray-500 mb-6">{t("ChangingModeWillClearCart") || "الانتقال لهذا النظام سيقوم بمسح محتويات السلة الحالية. هل أنت متأكد؟"}</p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => setShowClearModal(false)} variant="outline" className="flex-1 border-gray-200 text-gray-700 hover:bg-gray-50">{t("Cancel") || "إلغاء"}</Button>
                <Button onClick={() => { if (pendingAction) pendingAction(); }} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-none">{t("Confirm") || "موافق ومسح"}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
