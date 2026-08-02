// components/Loading.jsx

import { Loader2 } from "lucide-react";
import React from "react";

const Loading = () => {
  return (
    <div className="flex items-center justify-center min-h-[200px]">
      <Loader2 className="h-12 w-12 animate-spin text-bg-primary" />
    </div>
  );
};

export default Loading;