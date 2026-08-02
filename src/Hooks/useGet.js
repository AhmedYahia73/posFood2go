import axiosInstance from "@/Pages/utils/axiosInstance";
import { useState, useEffect, useCallback } from "react";

const cache = {}; // 🧠 كاش بسيط على مستوى التطبيق كله

export function useGet(initialEndpoint, { useCache = false } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const baseUrl = import.meta.env.VITE_API_BASE_URL;

  const fetchData = useCallback(
    async (endpoint = initialEndpoint, force = false) => {
      if (!endpoint) return null;

      // 🧩 استخدم الكاش لو موجود ومش طالب force
      if (useCache && cache[endpoint] && !force) {
        setData(cache[endpoint]);
        return cache[endpoint];
      }

      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("token");
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const response = await axiosInstance.get(`${baseUrl}${endpoint}`, { headers });

        setData(response.data);

        // 💾 خزّن في الكاش
        if (useCache) {
          cache[endpoint] = response.data;
        }

        setLoading(false);
        return response.data;
      } catch (err) {
        const message = err.response?.data?.message || err.message || "Error occurred";
        const errorObj = new Error(message);
        setError(errorObj);
        setLoading(false);
        throw errorObj;
      }
    },
    [baseUrl, initialEndpoint, useCache]
  );

  useEffect(() => {
    if (initialEndpoint) {
      fetchData(initialEndpoint);
    }
  }, [fetchData, initialEndpoint]);

  // 🧹 دالة تمسح الكاش لو عاوزة تحدث البيانات يدوي
  const clearCache = () => {
    if (useCache && cache[initialEndpoint]) {
      delete cache[initialEndpoint];
    }
  };

  return { data, isLoading: loading, error, refetch: fetchData, clearCache };
}
