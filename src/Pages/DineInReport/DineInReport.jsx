import Loading from "@/components/Loading";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import React, { useState, useEffect } from "react";
import { toast ,ToastContainer} from "react-toastify";


const DineInReport = () => {
  const [activeLocationId, setActiveLocationId] = useState(null);
  const [filters, setFilters] = useState({ financial_id: "", captain_id: "" });

  // 1. جلب قائمة الصالات
  const { data: selectionData } = useGet("cashier/reports/captain_lists?branch_id=4&locale=ar");

  // 2. هوك جلب التقرير (Instance)
  // خلي بالك: الـ useGet عندك بتعمل fetch أول ما الـ endpoint يتوجد
  const { data: reportData, isLoading, refetch } = useGet(
    activeLocationId ? `cashier/reports/captain_order_report_instance/${activeLocationId}` : null
  );

  // 3. هوك الـ Post للاعتماد النهائي
  const { postData, loading: posting } = usePost();

  useEffect(() => {
    if (selectionData?.halls?.length > 0 && !activeLocationId) {
      setActiveLocationId(selectionData.halls[0].id);
    }
  }, [selectionData, activeLocationId]);



  const handleFinalSubmit = async () => {
    try {
      await postData("cashier/reports/captain_report", { 
        ...filters, 
        location_id: activeLocationId 
      });
      toast.success("تم فلترة التقرير بنجاح! 🎉");
    } catch (err) {
        console.log(err)
        console.log(err?.response?.data?.errors );
        
      toast.error(err?.response?.data?.errors || err.message || "حدث خطأ أثناء فلترة التقرير.");
    }
  };

  return (
    <div className="p-4">
        <ToastContainer position="top-right" autoClose={3000} />
      {/* التابات */}
      <div className="flex border-b mb-4">
        {selectionData?.halls?.map((loc) => (
          <button 
            key={loc.id}
            onClick={() => setActiveLocationId(loc.id)}
            className={`px-4 py-2 ${activeLocationId === loc.id ? "border-b-2 border-blue-600 text-blue-600" : ""}`}
          >
            {loc.name}
          </button>
        ))}
      </div>

      {/* منطقة الفلاتر والزرار في صف واحد */}
      <div className="grid grid-cols-12 gap-4 items-end bg-white p-4 rounded shadow-sm mb-4">
        <div className="col-span-4">
          <label className="text-sm font-bold mb-1 block">طريقة الدفع (Financial):</label>
          <select 
            className="w-full border p-2 rounded"
            onChange={(e) => setFilters({...filters, financial_id: e.target.value})}
          >
            <option value="">كل الطرق</option>
            {selectionData?.financial_accounts?.map(f => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <div className="col-span-4">
          <label className="text-sm font-bold mb-1 block">الكابتن:</label>
          <select 
            className="w-full border p-2 rounded"
            onChange={(e) => setFilters({...filters, captain_id: e.target.value})}
          >
            <option value="">كل الكباتن</option>
            {selectionData?.captain_orders?.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))} 
                     </select>
        </div>

        {/* الزرار بجانب الفلاتر */}
        <div className="col-span-4 flex gap-2">
          <button 
            onClick={handleFinalSubmit}
            className="bg-bg-primary text-white px-4 py-2 rounded flex-1 hover:bg-red-700 transition"
          >
            تطبيق الفلترة
          </button>
          {/* <button 
            onClick={handleFinalSubmit}
            disabled={posting}
            className="bg-green-600 text-white px-4 py-2 rounded flex-1 hover:bg-green-700 transition"
          >
            {posting ? "جاري الحفظ..." : "اعتماد التقرير"}
          </button> */}
        </div>
      </div>

      {/* عرض البيانات */}
      <div className="bg-gray-50 p-4 rounded border min-h-[200px]">
        <h3 className="font-bold mb-2">بيانات الصالة الحالية:</h3>
        {isLoading ? (
          <Loading/>
        ) : (
          <pre className="text-xs">{JSON.stringify(reportData, null, 2)}</pre>
        )}
      </div>
    </div>
  );
};

export default DineInReport;