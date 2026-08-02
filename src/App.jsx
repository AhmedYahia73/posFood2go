// App.jsx
import React, { useEffect, useState } from "react";
import { RouterProvider } from "react-router-dom";
import router from "./router";
import "./firebase";
import "react-toastify/dist/ReactToastify.css";
import NotificationListener from "@/components/NotificationListener"; // جديد

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const handleEnter = (e) => {
      if (e.key === "Enter") {
        const defaultBtn = document.querySelector("[data-enter]");
        if (defaultBtn) defaultBtn.click();
      }
    };

    window.addEventListener("keydown", handleEnter);

    // check لو في token يبقى مسجل دخول
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);

    return () => window.removeEventListener("keydown", handleEnter);
  }, []);


  return (
    <>
      <RouterProvider router={router} />

      {/* الـ Listener يشتغل بس لو اليوزر مسجل دخول */}
      {isLoggedIn && <NotificationListener  />}
    </>
  );
}

export default App;