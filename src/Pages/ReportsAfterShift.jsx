import { getCurrencySymbol } from '../utils/currency';
// src/Pages/EndShiftReportModal.jsx
import React, { useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FaMoneyBillWave,
  FaShoppingCart,
  FaPrint,
} from "react-icons/fa";

// ─── ترويسة موحدة لأقسام التقرير ───
const SectionHeader = ({ icon: Icon, title }) => (
  <h3 className="font-bold text-lg flex items-center gap-2 mb-4 text-gray-800 border-b pb-2 border-gray-200">
    <Icon className="text-xl text-gray-600" />
    {title}
  </h3>
);

const getSafeJSON = (key) => {
  try {
    const item = localStorage.getItem(key);
    // إذا كان المفتاح غير موجود، أو يحتوي على [object Object] (تخزين خاطئ)
    // أو إذا كان النص لا يبدأ بـ { أو [ (ليس JSON valid في الغالب)
    if (!item || item.includes("[object Object]") || (!item.startsWith('{') && !item.startsWith('['))) {
      return {};
    }
    return JSON.parse(item);
  } catch (e) {
    console.error(`Error parsing ${key} from localStorage:`, e);
    return {};
  }
};

// 2. قراءة البيانات بأمان
const userData = getSafeJSON("user");
const shiftStartTimeRaw = localStorage.getItem("shiftStartTime");
const shiftStartTime = getSafeJSON("shiftStartTime");

const canShowTax = Number(userData.total_tax) === 1;
const canShowService = Number(userData.service_fees) === 1;

// ─── مكون تقرير الطباعة المنفصل ───
const PrintableReport = React.forwardRef(
  ({ reportData, shiftInfo, t, formatAmount, isArabic }, ref) => {

    const {
      financial_accounts,
      start_amount,
      expenses_total,
      void_order_sum,
      net_cash_drawer,
      actual_total,
      total_amount,
      order_count
    } = reportData;

    const cashShortage = (actual_total || 0) - (net_cash_drawer || 0);

    return (
      <div ref={ref} className="print-report-container" style={{ display: "none" }}>
        <style>
          {`
            @media print {
              @page { size: A4; margin: 15mm; }
              * { box-sizing: border-box; -webkit-print-color-adjust: exact; color-adjust: exact; }
              html, body { width: 100% !important; margin: 0 !important; padding: 0 !important; font-family: 'Tahoma', sans-serif; font-size: 13px; line-height: 1.6; direction: ${isArabic ? "rtl" : "ltr"}; background: white !important; color: black !important; }
              .print-wrapper { width: 100% !important; max-width: 800px; margin: 0 auto; }
              
              /* Header */
              .print-header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 20px; }
              .print-title { font-size: 24px; font-weight: bold; text-transform: uppercase; margin-bottom: 10px; }
              .header-info { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; text-align: ${isArabic ? "right" : "left"}; font-size: 12px; }
              
              /* Sections */
              .print-section { margin-bottom: 20px; }
              .section-title { font-size: 16px; font-weight: bold; background: #f0f0f0 !important; padding: 5px 10px; border: 1px solid #000; margin-bottom: 10px; text-transform: uppercase; }
              
              /* Rows */
              .data-row { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dashed #ccc; }
              .data-row.bold { font-weight: bold; font-size: 14px; border-bottom: 1px solid #000; margin-top: 5px; }
              
              /* Tables */
              .print-table { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
              .print-table th, .print-table td { border: 1px solid #000; padding: 8px; text-align: center; }
              .print-table th { background: #f0f0f0 !important; font-weight: bold; }
              
              /* Final Totals Box */
              .totals-box { border: 2px solid #000; padding: 15px; margin-top: 20px; }
              .totals-row { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; padding: 5px 0; }
              .totals-note { font-size: 11px; font-weight: normal; color: #555 !important; }
            }
          `}
        </style>

        <div className="print-wrapper">
          {/* Header Section */}
          <div className="print-header">
            <div className="print-title">{t("EndShiftReport") || "End shift report"}</div>
            <div className="header-info">
              <div><strong>{t("PrintedAt") || "Printed at"}:</strong> {shiftInfo.printedAt}</div>
              <div><strong>{t("CashierName") || "Cashier name"}:</strong> {shiftInfo.cashierName}</div>
              <div><strong>{t("Branch") || "Branch"}:</strong> {shiftInfo.branchName}</div>
              <div><strong>{t("POSMachine") || "POS machine"}:</strong> {shiftInfo.posMachine}</div>
              <div><strong>{t("ShiftOpenedAt") || "Shift opened at"}:</strong> {shiftInfo.openedAt}</div>
              <div><strong>{t("ShiftClosedAt") || "Shift closed at"}:</strong> {shiftInfo.closedAt}</div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="print-section">
            <div className="section-title">{t("FinancialSummary") || "Financial summary"}</div>
            <div className="data-row">
              <span>{t("StartBalance") || "Start Balance"}</span>
              <span>{formatAmount(start_amount || 0)}</span>
            </div>

            {/* Payment Methods */}
            {financial_accounts?.map((acc, idx) => (
              <div className="data-row" key={idx}>
                <span>{acc.financial_name}</span>
                <span>{formatAmount((acc.total_amount_dine_in || 0) + (acc.total_amount_take_away || 0) + (acc.total_amount_delivery || 0))}</span>
              </div>
            ))}

            <div className="data-row bold">
              <span>{t("TotalAmount") || "Total amount"}</span>
              <span>{formatAmount(total_amount || 0)}</span>
            </div>
            <div className="data-row text-red-600">
              <span>{t("Returns") || "Returns (Void)"}</span>
              <span>-{formatAmount(void_order_sum || 0)}</span>
            </div>
            <div className="data-row text-red-600">
              <span>{t("Expenses") || "Expenses"}</span>
              <span>-{formatAmount(expenses_total || 0)}</span>
            </div>
            <div className="data-row bold">
              <span>{t("NetAmount") || "Net amount"}</span>
              <span>{formatAmount((total_amount || 0) - (void_order_sum || 0) - (expenses_total || 0))}</span>
            </div>
          </div>

          {/* Order Types Summary */}
          <div className="print-section">
            <div className="section-title">{t("OrderTypesSummary") || "Order types summary"}</div>
            <table className="print-table">
              <thead>
                <tr>
                  <th>{t("OrderType") || "Type"}</th>
                  <th>{t("NumberOfOrders") || "Number of orders"}</th>
                  <th>{t("OrderAmount") || "Order amount"}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{t("DineIn") || "Dine in"}</td>
                  <td>{reportData?.orders_count?.dine_in_orders_count || 0}</td>
                  <td>{formatAmount(reportData?.orders_amount?.dine_in_amount || 0)}</td>
                </tr>
                <tr>
                  <td>{t("TakeAway") || "Takeaway"}</td>
                  <td>{reportData?.orders_count?.take_away_orders_count || 0}</td>
                  <td>{formatAmount(reportData?.orders_amount?.take_away_amount || 0)}</td>
                </tr>
                <tr>
                  <td>{t("Delivery") || "Delivery"}</td>
                  <td>{reportData?.orders_count?.delivery_orders_count || 0}</td>
                  <td>{formatAmount(reportData?.orders_amount?.delivery_amount || 0)}</td>
                </tr>
                <tr style={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}>
                  <td>{t("TotalOrders") || "Total orders"}</td>
                  <td>{order_count || 0}</td>
                  <td>{formatAmount((reportData?.orders_amount?.dine_in_amount || 0) + (reportData?.orders_amount?.take_away_amount || 0) + (reportData?.orders_amount?.delivery_amount || 0))}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Calculations Box */}
          <div className="totals-box">
            <div className="totals-row">
              <div>
                {t("NetCashInDrawer") || "Net cash in drawer"}
                <div className="totals-note">(total cash in shift - expenses - returns)</div>
              </div>
              <div>{formatAmount(net_cash_drawer || 0)}</div>
            </div>
            <hr style={{ borderTop: "1px dashed #ccc", margin: "10px 0" }} />
            <div className="totals-row">
              <div>
                {t("CashShortage") || "Cash shortage (Gap)"}
                <div className="totals-note">(actual total in drawer - net cash in drawer)</div>
              </div>
              <div style={{ color: cashShortage < 0 ? "red" : "black" }}>
                {formatAmount(cashShortage)}
              </div>
            </div>
            <hr style={{ borderTop: "2px solid #000", margin: "10px 0" }} />
            <div className="totals-row">
              <div>
                {t("TotalSales") || "Total sales"}
                <div className="totals-note">(all payment methods - expenses - returns)</div>
              </div>
              <div>{formatAmount((total_amount || 0) - (expenses_total || 0) - (void_order_sum || 0))}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);
PrintableReport.displayName = "PrintableReport";

// ─── المكون الرئيسي (UI Modal) ───
export default function EndShiftReportModal({
  reportData,
  onClose,
  onConfirmClose,
}) {
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";
  const printRef = useRef(null);

  useEffect(() => {
    if (reportData && reportData.report_role === "unactive") {
      onConfirmClose();
    }
  }, [reportData, reportData?.report_role, onConfirmClose]);

  // تجهيز بيانات الـ Header من الـ LocalStorage
  const shiftInfo = useMemo(() => {
    const localeDateConfig = isArabic ? "ar-EG" : "en-US";

    let formattedOpenedAt = "N/A";

    // 1. إذا كان التاريخ مخزناً داخل Object (الحالة المثالية)
    if (shiftStartTime?.created_at) {
      formattedOpenedAt = new Date(shiftStartTime.created_at).toLocaleString(localeDateConfig);
    }
    // 2. إذا كان التاريخ مخزناً كنص مباشر في localStorage (مثل الحالة التي أرسلتها)
    else if (typeof shiftStartTimeRaw === "string" && shiftStartTimeRaw !== "" && !shiftStartTimeRaw.includes("[object")) {
      const date = new Date(shiftStartTimeRaw);
      if (!isNaN(date.getTime())) {
        formattedOpenedAt = date.toLocaleString(localeDateConfig);
      }
    }

    return {
      printedAt: new Date().toLocaleString(localeDateConfig),
      // تأكد من استخدام Optional Chaining (?) دائماً لتجنب أخطاء الـ Object
      cashierName: reportData?.shift?.employee_name || shiftStartTime?.user_name || userData?.user_name || "N/A",
      branchName: reportData?.shift?.branch_name || shiftStartTime?.branch?.name || userData?.branch?.name || "Main Branch",
      posMachine: reportData?.shift?.pos_name || "POS-1",
      openedAt: reportData?.shift?.opened_at || formattedOpenedAt,
      closedAt: reportData?.shift?.closed_at || new Date().toLocaleString(localeDateConfig),
    };
    // أضف المتغيرات الجديدة لمصفوفة الاعتمادات لضمان التحديث
  }, [reportData, isArabic, shiftStartTime, shiftStartTimeRaw, userData]);

  if (!reportData || reportData.report_role === "unactive") return null;

  const { financial_accounts, start_amount, expenses_total, void_order_sum, net_cash_drawer, actual_total, total_amount, order_count } = reportData;
  const cashShortage = (actual_total || 0) - (net_cash_drawer || 0);
  const netAmountCalculated = (total_amount || 0) - (void_order_sum || 0) - (expenses_total || 0);

  const formatAmount = (amount, currency = getCurrencySymbol()) => {
    return `${(amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=800,height=800");
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${isArabic ? "rtl" : "ltr"}">
      <head>
        <meta charset="UTF-8">
        <title>${t("EndShiftReport")}</title>
      </head>
      <body>
        ${printContent.innerHTML}
      </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 md:p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-y-auto flex flex-col" dir={isArabic ? "rtl" : "ltr"}>

        {/* Header Fixed */}
        <div className="bg-white p-5 border-b border-gray-200 sticky top-0 z-10 flex items-center justify-between rounded-t-xl">
          <h2 className="text-2xl font-bold text-gray-800">{t("EndShiftReport") || "End shift report"}</h2>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm font-medium"
          >
            <FaPrint /> {t("Print") || "طباعة"}
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">

          {/* Header Info Grid */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div><span className="text-gray-500 block">{t("PrintedAt")}:</span> <span className="font-semibold">{shiftInfo.printedAt}</span></div>
            <div><span className="text-gray-500 block">{t("CashierName")}:</span> <span className="font-semibold">{shiftInfo.cashierName}</span></div>
            <div><span className="text-gray-500 block">{t("Branch")}:</span> <span className="font-semibold">{shiftInfo.branchName}</span></div>
            <div><span className="text-gray-500 block">{t("POSMachine")}:</span> <span className="font-semibold">{shiftInfo.posMachine}</span></div>
            <div><span className="text-gray-500 block">{t("ShiftOpenedAt")}:</span> <span className="font-semibold" dir="ltr">{shiftInfo.openedAt}</span></div>
            <div><span className="text-gray-500 block">{t("ShiftClosedAt")}:</span> <span className="font-semibold" dir="ltr">{shiftInfo.closedAt}</span></div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <SectionHeader icon={FaMoneyBillWave} title={t("FinancialSummary") || "Financial summary"} />
            <div className="space-y-3">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <span className="font-medium text-gray-700">{t("StartBalance") || "Start Balance"}</span>
                <span className="font-bold">{formatAmount(start_amount || 0)}</span>
              </div>

              <div className="border-s-4 border-blue-500 ps-3 ms-1 my-2 space-y-2">
                {financial_accounts?.map((acc, idx) => {
                  const accTotal = (acc.total_amount_dine_in || 0) + (acc.total_amount_take_away || 0) + (acc.total_amount_delivery || 0);
                  return (
                    <div key={idx} className="flex justify-between text-sm">
                      <span className="text-gray-600">{acc.financial_name}</span>
                      <span className="font-semibold">{formatAmount(accTotal)}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-center border-t border-gray-200 pt-3 mt-2">
                <span className="font-bold text-gray-800">{t("TotalAmount") || "Total amount"}</span>
                <span className="font-bold text-lg">{formatAmount(total_amount || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span>{t("Returns") || "Returns"}</span>
                <span>-{formatAmount(void_order_sum || 0)}</span>
              </div>
              <div className="flex justify-between items-center text-red-600">
                <span>{t("Expenses") || "Expenses"}</span>
                <span>-{formatAmount(expenses_total || 0)}</span>
              </div>
              <div className="flex justify-between items-center bg-green-50 p-3 rounded border border-green-100 mt-2">
                <span className="font-bold text-green-800">{t("NetAmount") || "Net amount"}</span>
                <span className="font-black text-green-700 text-lg">{formatAmount(netAmountCalculated)}</span>
              </div>
            </div>
          </div>

          {/* Order Types Summary */}
          <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100">
            <SectionHeader icon={FaShoppingCart} title={t("OrderTypesSummary") || "Order types summary"} />
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" dir={isArabic ? "rtl" : "ltr"}>
                <thead>
                  <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
                    <th className={`p-3 border-b ${isArabic ? "text-right" : "text-left"}`}>{t("OrderType")}</th>
                    <th className="p-3 border-b text-center">{t("NumberOfOrders")}</th>
                    <th className="p-3 border-b text-center">{t("OrderAmount") || "Order Amount"}</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <tr className="border-b">
                    <td className={`p-3 ${isArabic ? "text-right" : "text-left"}`}>{t("DineIn") || "Dine in"}</td>
                    <td className="p-3 text-center font-medium">{reportData?.orders_count?.dine_in_orders_count || 0}</td>
                    <td className="p-3 text-center font-medium">{formatAmount(reportData?.orders_amount?.dine_in_amount || 0)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={`p-3 ${isArabic ? "text-right" : "text-left"}`}>{t("TakeAway") || "Takeaway"}</td>
                    <td className="p-3 text-center font-medium">{reportData?.orders_count?.take_away_orders_count || 0}</td>
                    <td className="p-3 text-center font-medium">{formatAmount(reportData?.orders_amount?.take_away_amount || 0)}</td>
                  </tr>
                  <tr className="border-b">
                    <td className={`p-3 ${isArabic ? "text-right" : "text-left"}`}>{t("Delivery") || "Delivery"}</td>
                    <td className="p-3 text-center font-medium">{reportData?.orders_count?.delivery_orders_count || 0}</td>
                    <td className="p-3 text-center font-medium">{formatAmount(reportData?.orders_amount?.delivery_amount || 0)}</td>
                  </tr>
                  <tr className="bg-gray-800 text-white font-bold">
                    <td className={`p-3 ${isArabic ? "rounded-r-md text-right" : "rounded-l-md text-left"}`}>{t("TotalOrders") || "Total orders"}</td>
                    <td className="p-3 text-center">{order_count || 0}</td>
                    <td className="p-3 text-center">{formatAmount((reportData?.orders_amount?.dine_in_amount || 0) + (reportData?.orders_amount?.take_away_amount || 0) + (reportData?.orders_amount?.delivery_amount || 0))}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Final Totals Box */}
          <div className="bg-gray-900 text-white p-6 rounded-xl shadow-lg border-2 border-gray-800 space-y-4">

            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{t("NetCashInDrawer") || "Net cash in drawer"}</p>
                <p className="text-xs text-gray-400">{t("TotalCashInShift") || "Total cash in shift"} - {t("Expenses") || "Expenses"} - {t("Returns") || "Returns"}</p>
              </div>
              <div className="text-2xl font-black text-green-400">{formatAmount(net_cash_drawer || 0)}</div>
            </div>

            <div className="h-px bg-gray-700 my-2"></div>

            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{t("CashShortage") || "Cash shortage / Gap"}</p>
                <p className="text-xs text-gray-400">{t("ActualTotalInDrawer") || "Actual total in drawer"} - {t("NetCashInDrawer") || "Net cash in drawer"}</p>
              </div>
              <div className={`text-2xl font-black ${cashShortage < 0 ? "text-red-400" : "text-white"}`}>
                {formatAmount(cashShortage)}
              </div>
            </div>

            <div className="h-px bg-gray-700 my-2"></div>

            <div className="flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{t("TotalSales") || "Total sales"}</p>
                <p className="text-xs text-gray-400">{t("AllPaymentMethods") || "All payment methods"} - {t("Expenses") || "Expenses"} - {t("Returns") || "Returns"}</p>
              </div>
              <div className="text-2xl font-black text-blue-400">
                {formatAmount((total_amount || 0) - (expenses_total || 0) - (void_order_sum || 0))}
              </div>
            </div>

          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-gray-200 bg-white rounded-b-xl flex gap-3 sticky bottom-0 z-10">
          <button
            onClick={onConfirmClose}
            className="flex-1 py-3 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition shadow-md"
          >
            {t("ConfirmCloseShift") || "Confirm Close Shift"}
          </button>
          {/* <button
            onClick={onClose}
            className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg font-semibold hover:bg-gray-300 transition"
          >
            {t("Cancel") || "Cancel"}
          </button> */}
        </div>
      </div>

      <PrintableReport
        ref={printRef}
        reportData={reportData}
        shiftInfo={shiftInfo}
        t={t}
        formatAmount={formatAmount}
        isArabic={isArabic}
      />
    </div>
  );
}