import React, { useEffect} from "react";
import { Merge, Split, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePost } from "@/Hooks/usePost";
import { toast, ToastContainer } from "react-toastify";
import { useTranslation } from "react-i18next";

const TableManagementActions = ({
    selectedTables,
    setSelectedTables,
    isSelectionMode,
    setIsSelectionMode,
    onSuccess,
    setSplitHandler
}) => {
    const { t } = useTranslation();
    const { postData, loading } = usePost();

    // دالة الدمج
    const handleMerge = async () => {
        if (selectedTables.length < 2) {
            toast.warning(t("SelectAtLeastTwoTables"));
            return;
        }

        try {
            // إرسال أول طاولة كـ table_id والباقي في المصفوفة كما طلبتي
            const payload = {
                table_id: selectedTables[0],
                merge_tables_ids: selectedTables.slice(1)
            };

            await postData("cashier/merge_table", payload);
            toast.success(t("TablesMergedSuccessfully"));
            resetMode();
            onSuccess(); // لتحديث البيانات في الصفحة الرئيسية
        } catch (err) {
            toast.error(t("MergeFailed"));
        }
    };

    // دالة الفصل (يتم استدعاؤها للطاولات المدمجة فقط)
    const handleSplit = async (tableId) => {
        try {
            await postData("cashier/split_table", { table_id: tableId });
            toast.success(t("TableSplitSuccessfully"));
            onSuccess();
        } catch (err) {
            toast.error(t("SplitFailed"));
        }
    };

    const resetMode = () => {
        setIsSelectionMode(false);
        setSelectedTables([]);
    };
    useEffect(() => {
        if (setSplitHandler) {
            setSplitHandler(() => handleSplit);
        }
    }, []);

    return (
        <div className="flex gap-2 mb-4">
            < ToastContainer />
            {!isSelectionMode ? (
                <Button
                    variant="outline"
                    className="bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                    onClick={() => setIsSelectionMode(true)}
                >
                    <Merge size={18} className="mr-2" /> {t("MergeTables")}
                </Button>
            ) : (
                <div className="flex items-center gap-2 bg-purple-50 p-2 rounded-lg border border-purple-200 animate-in fade-in zoom-in">
                    <span className="text-sm font-medium text-purple-800 px-2">
                        {t("Selected")}: {selectedTables.length}
                    </span>
                    <Button size="sm" onClick={handleMerge} disabled={loading || selectedTables.length < 2}>
                        {loading ? "..." : <Check size={18} />}
                    </Button>
                    <Button size="sm" variant="destructive" onClick={resetMode}>
                        <X size={18} />
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TableManagementActions;