import React from "react";
import { useParams } from "react-router-dom";
import { useGet } from "@/Hooks/useGet";
import Loading from "@/components/Loading";

const InvoicePage = () => {
    const { id } = useParams();
    const { data, isLoading } = useGet(`cashier/orders/invoice/${id}`);

    if (isLoading) return <Loading />;
    if (!data) return <p className="text-center mt-10">No Invoice Data Found</p>;

    const order = data.order;

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="p-8 max-w-2xl mx-auto bg-white" id="printable-invoice">
            {/* زر الطباعة - يختفي عند الطباعة الفعلية */}
            <div className="flex justify-end mb-6 no-print">
                <button
                    onClick={handlePrint}
                    className="bg-bg-primary text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
                >
                    طباعة الفاتورة (Print)
                </button>
            </div>

            {/* تصميم الفاتورة */}
            <div className="border p-6 rounded-md">
                <div className="text-center border-b pb-4 mb-4">
                    <h1 className="text-2xl font-bold">Food2Go</h1>
                    <p className="text-gray-500">{order.branch?.name} - {order.branch?.address}</p>
                    <p className="text-sm">هاتف: {order.branch?.phone}</p>
                </div>

                <div className="flex justify-between mb-6 text-sm">
                    <div>
                        <p><strong>رقم الطلب:</strong> #{order.order_number}</p>
                        <p><strong>التاريخ:</strong> {order.order_date} {order.order_time}</p>
                    </div>
                    <div className="text-right">
                        <p><strong>العميل:</strong> {order.user?.name}</p>
                        <p><strong>الهاتف:</strong> {order.user?.phone}</p>
                    </div>
                </div>

                <table className="w-full text-left border-collapse mb-6">
                    <thead>
                        <tr className="bg-gray-100 text-right">
                            <th className="p-2 border">المنتج</th>
                            <th className="p-2 border">السعر</th>
                            <th className="p-2 border">الخصم</th>
                            <th className="p-2 border">الضريبة</th>
                            <th className="p-2 border">الكمية</th>
                            <th className="p-2 border">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody className="text-right">
                        {order.order_details?.map((item, index) => {
                            // البيانات تحت product[0]
                            const productWrapper = item.product?.[0];
                            const product = productWrapper?.product;
                            const count = parseFloat(productWrapper?.count || 1);
                            
                            // الحصول على القيم من product
                            const price = parseFloat(product?.price || 0);
                            const discount = parseFloat(product?.discount_val || 0);
                            const tax = parseFloat(product?.tax_only || 0);
                            const finalPrice = parseFloat(product?.price_after_tax || 0);
                            
                            const total = finalPrice * count;
                            
                            return (
                                <tr key={index}>
                                    <td className="p-2 border">
                                        <div className="font-medium">{product?.name}</div>
                                        {/* عرض الـ Variations */}
                                        {item.variations?.map((v, vidx) => (
                                            <div key={vidx}>
                                                <div className="text-xs font-semibold text-gray-600 mt-1">{v.name}:</div>
                                                {v.options?.map((opt, oidx) => (
                                                    <div key={oidx} className="text-xs text-gray-500">
                                                        • {opt.name}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                        {/* عرض الـ Extras */}
                                        {item.extras?.length > 0 && (
                                            <div className="text-xs text-blue-500 mt-1">
                                                <span className="font-semibold">Extras:</span>
                                                {item.extras.map((extra, idx) => (
                                                    <div key={idx}>+ {extra.name}</div>
                                                ))}
                                            </div>
                                        )}
                                        {/* عرض الـ Addons */}
                                        {item.addons?.length > 0 && (
                                            <div className="text-xs text-purple-500 mt-1">
                                                <span className="font-semibold">Addons:</span>
                                                {item.addons.map((addon, idx) => (
                                                    <div key={idx}>+ {addon.name}</div>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="p-2 border text-center">{price.toFixed(2)}</td>
                                    <td className="p-2 border text-center text-red-600">
                                        {discount > 0 ? `-${discount.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-2 border text-center text-green-600">
                                        {tax > 0 ? `+${tax.toFixed(2)}` : '-'}
                                    </td>
                                    <td className="p-2 border text-center">{count}</td>
                                    <td className="p-2 border text-center font-semibold">{total.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                <div className="border-t pt-4 text-right space-y-2">
                    {/* حساب الـ Sub Total */}
                    {(() => {
                        let subTotal = 0;
                        let totalDiscount = 0;
                        let totalTax = 0;
                        
                        order.order_details?.forEach(item => {
                            const productWrapper = item.product?.[0];
                            const product = productWrapper?.product;
                            const count = parseFloat(productWrapper?.count || 1);
                            
                            const price = parseFloat(product?.price || 0);
                            const discount = parseFloat(product?.discount_val || 0);
                            const tax = parseFloat(product?.tax_only || 0);
                            
                            subTotal += price * count;
                            totalDiscount += discount * count;
                            totalTax += tax * count;
                        });
                        
                        const deliveryFee = parseFloat(order.address?.zone?.price || 0);
                        const grandTotal = parseFloat(order.amount || 0);
                        
                        return (
                            <>
                                <div className="flex justify-between">
                                    <span>المجموع الفرعي (قبل الخصم):</span>
                                    <span className="font-medium">{subTotal.toFixed(2)} ج.م</span>
                                </div>
                                {totalDiscount > 0 && (
                                    <div className="flex justify-between text-red-600">
                                        <span>الخصم الإجمالي:</span>
                                        <span className="font-medium">-{totalDiscount.toFixed(2)} ج.م</span>
                                    </div>
                                )}
                                {totalTax > 0 && (
                                    <div className="flex justify-between text-green-600">
                                        <span>الضريبة الإجمالية:</span>
                                        <span className="font-medium">+{totalTax.toFixed(2)} ج.م</span>
                                    </div>
                                )}
                                {deliveryFee > 0 && (
                                    <div className="flex justify-between">
                                        <span>خدمة التوصيل:</span>
                                        <span className="font-medium">+{deliveryFee.toFixed(2)} ج.م</span>
                                    </div>
                                )}
                                <div className="flex justify-between font-bold text-lg border-t mt-3 pt-3 bg-red-50 p-3 rounded">
                                    <span>الإجمالي الكلي:</span>
                                    <span className="text-red-600">{grandTotal.toFixed(2)} ج.م</span>
                                </div>
                            </>
                        );
                    })()}
                </div>

                <div className="mt-10 text-center text-xs text-gray-400">
                    Powered by Food2Go - food2go.online
                    <br />
                    شكراً لتعاملكم معنا!
                </div>
            </div>

            {/* CSS لإخفاء الأزرار عند الطباعة */}
            <style>{`
  @media print {
    /* إخفاء كل العناصر */
    body * {
      visibility: hidden;
    }
    
    /* إظهار حاوية الفاتورة فقط */
    #printable-invoice, #printable-invoice * {
      visibility: visible;
    }

    #printable-invoice {
      position: static; /* نغيرها من absolute لـ static */
      width: 100%;
      max-width: 800px; /* يمكنك التحكم في العرض الأقصى للفاتورة هنا */
      margin: 0 auto;  /* هذا هو السر في التوسيط */
      padding: 40px;   /* زيادة الهوامش الداخلية لتكون مريحة للعين */
    }

    /* إخفاء زر الطباعة */
    .no-print {
      display: none !important;
    }

    /* ضبط الصفحة لإزالة العناوين الافتراضية للمتصفح */
    @page {
      size: auto;
      margin: 10mm; /* إضافة هامش بسيط للصفحة نفسها لضمان عدم القص عند الطباعة */
    }

    /* تحسين شكل الجداول */
    table {
      width: 100% !important;
      border-collapse: collapse;
    }
    
    /* لضمان خلفية الجدول تظهر في الطباعة (اختياري) */
    .bg-gray-100 {
      background-color: #f3f4f6 !important;
      -webkit-print-color-adjust: exact;
    }
  }
`}</style>
        </div>
    );
};

export default InvoicePage;