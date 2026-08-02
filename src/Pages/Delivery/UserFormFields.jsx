//each fields which related to user form is defined in this component
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

const UserFormFields = ({ form }) => {
    const { t } = useTranslation();
  
  return (
    <>
      <FormField
        control={form.control}
        name="f_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("FirstName")}</FormLabel>
            <FormControl>
              <Input placeholder={t("FirstName")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="l_name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("LastName")}</FormLabel>
            <FormControl>
              <Input placeholder={t("LastName")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("PhoneNumber")}</FormLabel>
            <FormControl>
              <Input placeholder={t("PhoneNumber")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="phone_2"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("PhoneNumber2Optional")}</FormLabel>
            <FormControl>
              <Input placeholder={t("PhoneNumber2Optional")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default UserFormFields;