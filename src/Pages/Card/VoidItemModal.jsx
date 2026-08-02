import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const VoidItemModal = ({
  open,
  onOpenChange,
  managerId,
  setManagerId,
  managerPassword,
  setManagerPassword,
  confirmVoidItem,
  onManagerIdChange,  
  isLoading,
}) => {
  const handleManagerIdBlur = async () => {
    if (!managerId || managerId.trim() === "") return;

    // منع التحقق المتكرر إذا كان نفس القيمة
    if (managerId === localStorage.getItem("lastValidatedManagerId")) {
      return;
    }

    await onManagerIdChange?.(managerId);
  };

  const handleClose = () => {
    setManagerId("");
    setManagerPassword("");
    onOpenChange(false);
  };
     const { t  } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("VoidItemManagerAuthentication")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="managerId" className="text-right font-medium">
{t("ManagerID")}            </label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              id="managerId"
              value={managerId}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, ""); // أرقام فقط
                setManagerId(value);
              }}
              onBlur={handleManagerIdBlur} // هنا التحقق
              className="col-span-3"
              placeholder={t("EnterManagerID")}
              disabled={isLoading}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <label htmlFor="password" className="text-right font-medium">
              {t("Password")}
            </label>
            <Input
              id="password"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              className="col-span-3"
              placeholder={t(
                "Enterpassword"
              )}
              disabled={isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isLoading}>
            {t("Cancel")}
          </Button>
          <Button
            onClick={confirmVoidItem}
            disabled={!managerId || !managerPassword || isLoading}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {isLoading ? t("Voiding") : t("ConfirmVoid")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default VoidItemModal;