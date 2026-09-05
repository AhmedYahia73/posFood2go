// src/utils/axiosInstance.js
import axios from "axios";
import { toast } from "react-toastify";

const baseURL = (window.API_BASE_URL || import.meta.env.VITE_API_BASE_URL);

const axiosInstance = axios.create({
  baseURL,
  transformResponse: [
    (data) => {
      if (typeof data === "string") {
        try {
          // Prevent precision loss by quoting large IDs like cart_id or id before JSON.parse
          const processedData = data.replace(
            /("id":|"cart_id":)\s*(\d{15,})/g,
            '$1"$2"'
          );
          return JSON.parse(processedData);
        } catch (e) {
          return data;
        }
      }
      return data;
    },
  ],
});

// ✅ Interceptor بيراقب كل responses
axiosInstance.interceptors.response.use(
  (response) => response, // لو تمام نرجّع الـ response عادي
  (error) => {
    if (error.response && error.response.status === 401) {
      // Session انتهت أو التوكن invalid
      toast.error("Session expired, please login again.");

      // حذف بيانات الدخول
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      localStorage.setItem("shiftStatus", "close");

      // إعادة التوجيه إلى صفحة اللوجين
      window.location.href = "/point-of-sale/login";
    }

    // نرجع الخطأ للـ hooks عشان يتعاملوا معاه لو محتاجين
    return Promise.reject(error);
  }
);

export default axiosInstance;
