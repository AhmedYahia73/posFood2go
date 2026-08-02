// src/redux/store.js
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import loaderReducer from "./LoaderSpinner";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    loader: loaderReducer,
  },
});
