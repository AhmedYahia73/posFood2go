import axiosInstance from "./axiosInstance";

/**
 * Checks if a string looks like raw coordinates or a placeholder instead of a real text address.
 * e.g. "30.0444, 31.2357", "30.0444,31.2357", "Location: 30.044, 31.235", empty, or default placeholders.
 */
export const isCoordinatesOrEmpty = (address) => {
  if (!address || typeof address !== "string") return true;
  const trimmed = address.trim();
  if (
    trimmed === "" ||
    trimmed === "عنوان مطعمك" ||
    trimmed === "العنوان" ||
    trimmed === "Restaurant Address"
  ) {
    return true;
  }
  // Matches coordinate patterns like "30.123, 31.456" or "Location: 30.123, 31.456"
  const coordRegex = /^(?:location:\s*)?-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/i;
  return coordRegex.test(trimmed);
};

/**
 * Ensures the branch address in localStorage is a human-readable address.
 * If already resolved and saved in localStorage, it returns immediately without calling the API.
 * If missing or still raw coordinates, it calls the backend Geocode API and saves the result in localStorage.
 *
 * @param {boolean} force - Force re-fetch from API even if cached.
 * @returns {Promise<string>} The resolved address.
 */
export const ensureBranchAddress = async (force = false) => {
  try {
    const cachedAddress = localStorage.getItem("restaurant_address");
    const isResolved = localStorage.getItem("branch_address_resolved") === "true";

    // If already resolved and not forced, and not raw coordinates, use it directly (0 delay)
    if (!force && isResolved && cachedAddress && !isCoordinatesOrEmpty(cachedAddress)) {
      return cachedAddress;
    }

    // Attempt to obtain coordinates from localStorage user or branch coords
    let lat = localStorage.getItem("branch_latitude");
    let lng = localStorage.getItem("branch_longitude");

    if (!lat || !lng) {
      try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        if (user?.branch) {
          lat = user.branch.latitude || lat;
          lng = user.branch.longitude || lng;
        }
      } catch (e) {
        // ignore parse error
      }
    }

    if (!lat || !lng) {
      // Check if current cachedAddress contains coordinates
      if (cachedAddress && isCoordinatesOrEmpty(cachedAddress)) {
        const cleaned = cachedAddress.replace(/^(?:location:\s*)/i, "").trim();
        const parts = cleaned.split(",").map((s) => s.trim());
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          lat = parts[0];
          lng = parts[1];
        }
      }
    }

    const token = localStorage.getItem("token");
    if (!token) return cachedAddress || "";

    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
    const API_BASE_URL = rawBaseUrl.trim().replace(/\/?$/, "/");
    const lang = localStorage.getItem("language") || "ar";

    const params = { locale: lang };
    if (lat && lng) {
      params.latitude = lat;
      params.longitude = lng;
    }

    const response = await axiosInstance.get(`${API_BASE_URL}cashier/branch_address`, {
      params,
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response?.data?.status && response?.data?.address) {
      const resolved = response.data.address;
      localStorage.setItem("restaurant_address", resolved);
      localStorage.setItem("branch_address_resolved", "true");
      return resolved;
    }
  } catch (error) {
    console.warn("ensureBranchAddress error:", error);
  }

  return localStorage.getItem("restaurant_address") || "";
};
