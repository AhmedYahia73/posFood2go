import { useEffect, useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useLocation, useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import { addressSchema, adduserSchema } from "@/Pages/Delivery/addressSchema";
import { parseCoordinates, tryGeocode } from "@/components/tryGeocode";
import { useTranslation } from "react-i18next";

export const useDeliveryForm = () => {
  const [selectedLocation, setSelectedLocation] = useState({
    lat: 31.2001, // Default to Alexandria, Egypt
    lng: 29.9187,
  });
  const [locationName, setLocationName] = useState("");
  const [selectedCityId, setSelectedCityId] = useState("");
  const [availableZones, setAvailableZones] = useState([]);
  const [formattedMapCoordinates, setFormattedMapCoordinates] = useState("");
  const [isAutoAddress, setIsAutoAddress] = useState(true);
 const { t ,i18n } = useTranslation();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const userIdFromUrl = searchParams.get("user_id");
  const isAddAnotherAddress = searchParams.has("user_id");

  const currentFormSchema = isEditMode || isAddAnotherAddress ? addressSchema : adduserSchema;

  const form = useForm({
    resolver: zodResolver(currentFormSchema),
    defaultValues: {
      f_name: "",
      l_name: "",
      phone: "",
      phone_2: "",
      city_id: "",
      zone_id: "",
      address: "",
      street: "",
      building_num: null,
      floor_num: null,
      apartment: null,
      additional_data: "",
      type: "",
    },
  });

  // تحميل بيانات الـ lists (cities & zones)
  const { data: addressListsData, isLoading: isLoadingLists } = useGet(`cashier/user/address/lists?${i18n.language === "ar"?`locale=ar`:"locale=en"}`);
  const cities = addressListsData?.cities || [];
  const allZones = addressListsData?.zones || [];

  // تحميل بيانات التعديل
  const { data: editAddressData, isLoading: isLoadingEditData } = useGet(
    isEditMode ? `cashier/shift_branch_reports/item/${id}` : null
  );

  const { data: userData, isLoading: isLoadinguserData } = useGet(
    isAddAnotherAddress && userIdFromUrl ? `cashier/user/${userIdFromUrl}` : null
  );

  // دالة الفلترة البسيطة
  const filterZonesByCity = useCallback((zones, cityId) => {
    if (!zones || !cityId) return [];
    return zones.filter(zone => zone.city_id && zone.city_id.toString() === cityId.toString());
  }, []);

  // معالجة تغيير المدينة
  const handleCityChange = useCallback((cityId) => {
    console.log("City changed to:", cityId);
    setSelectedCityId(cityId);
    form.setValue("city_id", cityId);
    form.setValue("zone_id", "");

    const zonesSource = allZones.length > 0 ? allZones : (editAddressData?.zones || []);
    const filteredZones = filterZonesByCity(zonesSource, cityId);
    console.log("Filtered zones:", filteredZones);
    setAvailableZones(filteredZones);
  }, [form, allZones, editAddressData, filterZonesByCity]);

  // تهيئة البيانات عند التحميل
  useEffect(() => {
    if (isEditMode) {
      if (isLoadingEditData || isLoadingLists) {
        console.log("Loading data...");
        return;
      }

      if (!editAddressData || !cities.length) {
        console.log("Data not ready yet");
        return;
      }

      const address = editAddressData.address;
      const zones = editAddressData.zones || allZones;

      console.log("Setting up edit data:", { address, zones, cities });

      const cityId = address.city_id?.toString() || address.zone?.city_id?.toString() || "";
      const cityZones = filterZonesByCity(zones, cityId);
      
      setSelectedCityId(cityId);
      setAvailableZones(cityZones);
      setLocationName(address.address || "");

      const formData = {
        city_id: cityId,
        zone_id: address.zone_id?.toString() || address.zone?.id?.toString() || "",
        address: address.address || "",
        street: address.street || "",
        building_num: address.building_num ? Number(address.building_num) : null,
        floor_num: address.floor_num ? Number(address.floor_num) : null,
        apartment: address.apartment ? Number(address.apartment) : null,
        additional_data: address.additional_data || "",
        type: address.type ? address.type.toLowerCase() : "",
      };

      console.log("Form data:", formData);
      
      setTimeout(() => {
        form.reset(formData);
      }, 0);

      const { latitude, longitude } = parseCoordinates(address.map);
      if (latitude && longitude && !isNaN(latitude) && !isNaN(longitude)) {
        setSelectedLocation({ lat: latitude, lng: longitude });
      }
    }
  }, [editAddressData, cities, allZones, isEditMode, isLoadingEditData, isLoadingLists, form, filterZonesByCity]);

  // تهيئة الموقع للوضع العادي
  useEffect(() => {
    if (!isEditMode && !isAddAnotherAddress && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const loc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setSelectedLocation(loc);
          // فقط في الوضع التلقائي
          if (isAutoAddress) {
            tryGeocode(loc.lat, loc.lng, setLocationName, form);
          }
        },
        (error) => {
          console.error("Error fetching location", error);
          const fallback = { lat: 31.2001, lng: 29.9187 };
          setSelectedLocation(fallback);
          // فقط في الوضع التلقائي
          if (isAutoAddress) {
            const defaultAddress = "Alexandria, Egypt (Default Location)";
            setLocationName(defaultAddress);
            form.setValue("address", defaultAddress, { shouldValidate: true });
          }
        }
      );
    } else if (isAddAnotherAddress && !locationName && isAutoAddress) {
      const defaultAddress = "Click on map to select address";
      setLocationName(defaultAddress);
      form.setValue("address", defaultAddress, { shouldValidate: true });
    }
  }, [isEditMode, isAddAnotherAddress, form]);

  // تعديل دالة handleMarkerDragEnd لتعمل فقط في الوضع التلقائي
  const handleMarkerDragEnd = (e) => {
    const marker = e.target;
    const { lat, lng } = marker.getLatLng();
    setSelectedLocation({ lat, lng });
    
    // فقط في الوضع التلقائي نحدث العنوان
    if (isAutoAddress) {
      tryGeocode(lat, lng, setLocationName, form);
    }
  };
const handleMapClick = useCallback((e) => {
  if (isAutoAddress) {
    const { lat, lng } = e.latlng;
    setSelectedLocation({ lat, lng });
    tryGeocode(lat, lng, setLocationName, form);
  }
}, [form, isAutoAddress]);
  return {
    form,
    selectedLocation,
    setSelectedLocation,
    locationName,
    setLocationName,
    selectedCityId,
    availableZones,
    formattedMapCoordinates,
    cities,
    zones: allZones,
    isEditMode,
    isAddAnotherAddress,
    userIdFromUrl,
    editAddressData,
    userData,
    isLoadingLists,
    isLoadingEditData,
    isLoadinguserData,
    handleCityChange,
    handleMarkerDragEnd,
    handleMapClick,
    currentFormSchema,
    isAutoAddress,
    setIsAutoAddress,
  };
};