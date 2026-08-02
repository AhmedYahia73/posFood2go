import React, { useEffect } from "react";
import OrderPage from "./OrderPage";

export default function TakeAway({ orderType }) {
  // Set order type in localStorage for consistency
  useEffect(() => {
    localStorage.setItem("order_type", "take_away");
  }, []);

  return (
    <OrderPage 
      propOrderType={orderType || "take_away"}
    />
  );
}