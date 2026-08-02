// components/CategorySelector.jsx
import React from "react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const CategorySelector = ({ categories, selectedCategory, onCategorySelect }) => {
  const { t } = useTranslation();

  if (categories.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        {t("NoCategoriesFound")}
      </div>
    )
  }

  return (
    /* تم تغيير flex-nowrap إلى flex-wrap وإزالة overflow-x-auto */
    <div className="flex flex-wrap w-full gap-3 pb-4">

      {/* زر "Favorite" */}
      {/* <div className="flex-shrink-0">
        <Button
          onClick={() => onCategorySelect("all")}
          className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[100px] h-[110px] shadow-sm transition-all border ${
            selectedCategory === "all"
              ? "bg-bg-primary text-white border-bg-primary hover:bg-red-800"
              : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
          }`}
        >
          <div className={`w-12 h-12 mb-2 rounded-full flex items-center justify-center shadow-inner ${
            selectedCategory === "all" ? "bg-white/20" : "bg-red-50"
          }`}>
            <span className="text-2xl">
              {selectedCategory === "all" ? "❤️" : "🤍"}
            </span>
          </div>
          <span className="text-sm font-bold">{t("Favorite")}</span>
        </Button>
      </div> */}

      {/* التصنيفات الديناميكية */}
      {categories.map((category) => (
        <div key={category.id} className="flex-shrink-0">
          <Button
            onClick={() => onCategorySelect(category.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[100px] h-[110px] shadow-sm transition-all border ${selectedCategory === category.id
                ? "bg-bg-primary text-white border-bg-primary hover:bg-red-800"
                : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
              }`}
          >
            <div className="w-12 h-12 mb-2 rounded-full overflow-hidden border-2 border-transparent shadow-sm">
              <img
                src={category.image_link}
                alt={category.name}
                className="w-full h-full object-cover"
              />
            </div>
            <span className="text-sm font-bold capitalize text-center leading-tight">
              {category.name}
            </span>
          </Button>
        </div>
      ))}
    </div>
  );
};

export default CategorySelector;