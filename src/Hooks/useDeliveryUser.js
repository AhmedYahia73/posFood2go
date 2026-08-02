// hooks/useDeliveryUser.js
import { useState, useEffect } from "react";
import { useGet } from "@/Hooks/useGet";

export const useDeliveryUser = (orderType) => {
  const [deliveryUserData, setDeliveryUserData] = useState(null);
  
  const selectedUserId = localStorage.getItem("selected_user_id");
  
  const {
    data: userData,
    isLoading: userLoading,
    error: userError,
  } = useGet(
    orderType === "delivery" && selectedUserId
      ? `cashier/user/item/${selectedUserId}`
      : null
  );

  useEffect(() => {
    if (orderType === "delivery") {
      // First try to get from localStorage for quick display
      const storedUserData = localStorage.getItem("selected_user_data");
      if (storedUserData) {
        try {
          setDeliveryUserData(JSON.parse(storedUserData));
        } catch (error) {
          console.error("Error parsing stored user data:", error);
        }
      }

      // If API data is available and structured correctly, update with fresh data
      if (userData && userData.user && userData.user.length > 0) {
        const user = userData.user[0];
        console.log("User data loaded:", user);

        const selectedAddressId = localStorage.getItem("selected_address_id");
        const selectedAddress =
          user.address?.find(
            (addr) => addr.id === parseInt(selectedAddressId)
          ) || user.address?.[0];

        const freshUserData = {
          id: user.id,
          f_name: user.f_name,
          l_name: user.l_name,
          phone: user.phone,
          phone_2: user.phone_2,
          selectedAddress: selectedAddress,
        };

        setDeliveryUserData(freshUserData);
        localStorage.setItem(
          "selected_user_data",
          JSON.stringify(freshUserData)
        );
      }
    }
  }, [orderType, userData, selectedUserId]);

  return {
    deliveryUserData,
    userLoading,
    userError,
  };
};