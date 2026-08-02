import React, { useState } from "react";
import { useGet } from "@/Hooks/useGet";
import { usePost } from "@/Hooks/usePost";
import { toast } from "react-toastify";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { FaEdit } from "react-icons/fa";
import Loading from "@/components/Loading";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";

const Profile = () => {
  const { data, loading, refetch } = useGet("cashier/profile");
  const { postData, loading: updating } = usePost();
  const [open, setOpen] = useState(false);
  const { t, i18n } = useTranslation();
  const isArabic = i18n.language === "ar";

  const [form, setForm] = useState({
    user_name: "",
    password: "",
    status: 1,
    image: null,
    print_takeaway_number: data?.print_takeaway_number || 0,
    cashier_receipt_count: data?.cashier_receipt_count || 1,
  });
  const [preview, setPreview] = useState(null);
  const [errors, setErrors] = useState({});

  // === إعدادات الطباعة (تحميل من localStorage) ===
  const [printDoubleDineIn, setPrintDoubleDineIn] = useState(JSON.parse(localStorage.getItem("printDoubleDineIn")) || false);
  const [printDoubleTakeAway, setPrintDoubleTakeAway] = useState(JSON.parse(localStorage.getItem("printDoubleTakeAway")) || false);
  const [printSmallTakeAway, setPrintSmallTakeAway] = useState(JSON.parse(localStorage.getItem("printSmallTakeAway")) || false);
  const [printDoubleDelivery, setPrintDoubleDelivery] = useState(JSON.parse(localStorage.getItem("printDoubleDelivery")) || false);
  const handleEdit = () => {
    if (data) {
      setForm({
        user_name: data.user_name || "",
        password: "",
        status: data.status || 1,
        image: null,
      });
      setPreview(data.image || null);
      setErrors({});
      setOpen(true);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrors({ ...errors, image: t("Imagesizemustbelessthan2MB") });
        return;
      }
      setForm({ ...form, image: file });
      setPreview(URL.createObjectURL(file));
      setErrors({ ...errors, image: "" });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!form.user_name.trim()) newErrors.user_name = t("Usernameisrequired");
    if (form.password && form.password.length < 3)
      newErrors.password = "Passwordmustbeatleast3characters";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const formData = new FormData();
    formData.append("user_name", form.user_name);
    formData.append("password", form.password);
    formData.append("status", form.status);
    if (form.image) formData.append("image", form.image);

    try {
      await postData("cashier/profile/update", formData, true);
      toast.success(t("Profileupdatedsuccessfully"));
      refetch();
      setOpen(false);
    } catch (err) {
      toast.error(t("Errorupdatingprofile"));
    }
  };

  const handleCancel = () => {
    setForm({ user_name: "", password: "", status: 1, image: null });
    setOpen(false);
  };

  // === دوال تغيير حالة الطباعة ===
  const handleToggleDineIn = (checked) => {
    setPrintDoubleDineIn(checked);
    localStorage.setItem("printDoubleDineIn", checked.toString()); // تأكدي من الاسم ده
  };

  const handleToggleTakeAwayDouble = (checked) => {
    setPrintDoubleTakeAway(checked);
    localStorage.setItem("printDoubleTakeAway", checked.toString()); // تأكدي من الاسم ده
  };

  const handleToggleDelivery = (checked) => {
    setPrintDoubleDelivery(checked);
    localStorage.setItem("printDoubleDelivery", checked.toString()); // تأكدي من الاسم ده
  };

  const handleToggleTakeAwaySmall = (checked) => {
    setPrintSmallTakeAway(checked);
    localStorage.setItem("printSmallTakeAway", checked.toString()); // تأكدي من الاسم ده
  };
  if (loading) return <Loading />;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Card className="max-w-md w-full shadow-xl rounded-2xl overflow-hidden bg-white">
        <CardContent className="flex flex-col items-center p-8">
          <div className="relative group">
            <Avatar className="w-28 h-28 mb-4 ring-4 ring-red-100 transition-all duration-300 group-hover:ring-red-300">
              {data?.image ? (
                <AvatarImage src={data.image} alt="Profile" className="object-cover" />
              ) : (
                <AvatarFallback className="text-2xl font-bold bg-red-100 text-red-600">
                  {data?.user_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              )}
            </Avatar>
          </div>

          <h2 className="text-2xl font-bold text-gray-900">{data?.user_name || "No Name"}</h2>
          <p className={`mt-2 text-sm font-medium px-3 py-1 rounded-full ${data?.status === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
            {data?.status === 1 ? "Active" : "Inactive"}
          </p>

          {/* === قسم إعدادات الطباعة === */}
          <div className="w-full mt-6 space-y-3">
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-2">{isArabic ? "إعدادات الطابعات والنسخ" : "Printer & Copies Settings"}</h3>

            {/* Dine In Switch */}
            <div className="p-3 border rounded-xl bg-gray-50 flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="font-bold text-gray-700">
                  {isArabic ? "صالة (نسختين كبار)" : "Dine In (2 Full Copies)"}
                </Label>
              </div>
              <Switch checked={printDoubleDineIn} onCheckedChange={handleToggleDineIn} />
            </div>

            {/* Take Away Switches (Grouped) */}
            <div className="p-3 border rounded-xl bg-blue-50 space-y-3">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">{isArabic ? "إعدادات التيك أواي" : "Take Away Settings"}</h4>

              <div className="flex items-center justify-between">
                <Label className="text-gray-700">
                  {isArabic ? "طباعة نسختين كاشير (كبار)" : "Print 2 Full Receipts"}
                </Label>
                <Switch checked={printDoubleTakeAway} onCheckedChange={handleToggleTakeAwayDouble} />
              </div>

              <div className="flex items-center justify-between border-t border-blue-200 pt-2">
                <Label className="text-gray-700">
                  {isArabic ? "طباعة ريسيت الرقم (الصغير)" : "Print Number Receipt (Small)"}
                </Label>
                <Switch checked={printSmallTakeAway} onCheckedChange={handleToggleTakeAwaySmall} />
              </div>
            </div>

            {/* Delivery Switch */}
            <div className="p-3 border rounded-xl bg-gray-50 flex items-center justify-between">
              <div className="flex flex-col">
                <Label className="font-bold text-gray-700">
                  {isArabic ? "توصيل (نسختين كبار)" : "Delivery (2 Full Copies)"}
                </Label>
              </div>
              <Switch checked={printDoubleDelivery} onCheckedChange={handleToggleDelivery} />
            </div>
          </div>

          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleEdit} className="mt-6 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-full flex items-center gap-2 transition-all duration-300">
                <FaEdit />
                {t("EditProfile")}
              </Button>
            </DialogTrigger>
            {/* ... (نفس كود الـ Dialog القديم بدون تغيير) ... */}
            <DialogContent className="max-w-md rounded-2xl bg-white p-6">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900">{t("EditProfile")}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleUpdate} className="space-y-5">
                {preview && (
                  <div className="flex justify-center">
                    <img src={preview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-2 border-red-200" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Username")}</Label>
                  <Input value={form.user_name} onChange={(e) => setForm({ ...form, user_name: e.target.value })} className={`border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-lg transition-all duration-200 ${errors.user_name ? "border-red-500" : ""}`} required />
                  {errors.user_name && <p className="text-red-500 text-xs mt-1">{errors.user_name}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Password")}</Label>
                  <Input type={t("Password")} placeholder="••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={`border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-lg transition-all duration-200 ${errors.password ? "border-red-500" : ""}`} />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("Status")}</Label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: Number(e.target.value) })} className="w-full border-gray-300 focus:border-red-500 focus:ring-red-500 rounded-lg px-3 py-2 text-sm transition-all duration-200">
                    <option value={1}>{t("Active")}</option>
                    <option value={0}>{t("Inactive")}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">{t("ProfileImage")}</Label>
                  <Input type="file" accept="image/*" onChange={handleImageChange} className="border-gray-300 rounded-lg" />
                  {errors.image && <p className="text-red-500 text-xs mt-1">{errors.image}</p>}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" className="border-gray-300 text-gray-700 hover:bg-gray-100 rounded-lg" onClick={handleCancel}>{t("Cancel")}</Button>
                  <Button type="submit" disabled={updating} className="bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all duration-200">{updating ? t("Saving") : t("Save")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;