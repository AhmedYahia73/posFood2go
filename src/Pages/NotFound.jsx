import React from "react";
import error from "@/assets/404 illustration.png";
export default function NotFound() {
  return (
    <div className="m-auto flex justify-center items-center flex-col pt-4">
      <img src={error} alt="404 image" />
      <div className="py-10 text-center">
        <h1 className="font-bold py-3">An error occurred</h1>
        <p>Sorry, we couldn't find the page you are looking for</p>
      </div>
    </div>
  );
}
