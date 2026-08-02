import { getCurrencySymbol } from '../../utils/currency';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// === الاستيرادات الجديدة المطلوبة للـ Combobox ===
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown } from "lucide-react";

import { useTranslation } from "react-i18next";

const AddressFormFields = ({
  form,
  locationName,
  setLocationName,
  cities,
  availableZones,
  handleCityChange,
  isAutoAddress = false,
  setIsAutoAddress,
}) => {
  const { t } = useTranslation();

  return (
    <>
      {/* Switch للاختيار بين التلقائي واليدوي */}
      <div className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
        <div className="flex flex-col">
          <span className="font-medium text-sm">{t("AddressSelectionMode")}</span>
          <span className="text-xs text-gray-600">
            {isAutoAddress ? t("Automaticfrommaplocation") : t("Manualaddressentry")}
          </span>
        </div>
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className={`text-sm ${!isAutoAddress ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {t("Manual")}
          </span>
          <button
            type="button"
            onClick={() => {
              const newValue = !isAutoAddress;
              if (setIsAutoAddress) {
                setIsAutoAddress(newValue);
              }
              if (!newValue) {
                form.setValue("address", "");
              }
            }}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              ${isAutoAddress ? 'bg-blue-600' : 'bg-gray-300'}
            `}
            aria-pressed={isAutoAddress}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
                ${isAutoAddress ? 'translate-x-5' : 'translate-x-0.5'}
              `}
            />
          </button>
          <span className={`text-sm ${isAutoAddress ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
            {t("Auto")}
          </span>
        </div>
      </div>

      {/* Address field */}
      <FormField
        control={form.control}
        name="address"
        render={({ field }) => (
          <FormItem>
            <FormLabel>
              {t("Address")} {isAutoAddress ? t("fromMap") : t("ManualEntry")}
            </FormLabel>
            <FormControl>
              {isAutoAddress ? (
                <Input
                  placeholder={t("Clickotaddress")}
                  {...field}
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                    field.onChange(e.target.value);
                  }}
                  className="bg-blue-50 border-blue-200"
                  readOnly={false}
                />
              ) : (
                <Input
                  placeholder={t("Enteryouraddressmanually")}
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                  value={field.value || ""}
                  className="bg-white border-gray-300"
                />
              )}
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Grid for optional fields */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { name: "street", label: t("Street") },
          { name: "building_num", label: t("BuildingNumber") },
          { name: "floor_num", label: t("FloorNumber") },
          { name: "apartment", label: t("Apartment") },
        ].map(({ name, label }) => (
          <FormField
            key={name}
            control={form.control}
            name={name}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label}</FormLabel>
                <FormControl>
                  <Input
                    type={name === "street" ? "text" : "number"}
                    {...field}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (name === "street") {
                        field.onChange(value === "" ? null : value);
                      } else {
                        field.onChange(value === "" ? null : Number(value));
                      }
                    }}
                    value={field.value === null ? "" : field.value}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ))}
      </div>

      {/* City & Zone - Combobox مع بحث */}
      <div className="grid grid-cols-2 gap-4">
        {/* City Combobox */}
        <FormField
          control={form.control}
          name="city_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("City")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value
                        ? cities.find((city) => city.id.toString() === field.value)?.name
                        : t("SelectCity")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t("SearchCity")} autoFocus />
                    <CommandList>
                      <CommandEmpty>{t("NoCityFound")}</CommandEmpty>
                      <CommandGroup>
                        {cities.map((city) => (
                          <CommandItem
                            key={city.id}
                            value={city.name}
                            onSelect={() => {
                              const newValue = city.id.toString();
                              field.onChange(newValue);
                              handleCityChange(newValue);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === city.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {city.name}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Zone Combobox */}
        <FormField
          control={form.control}
          name="zone_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("Zone")}</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      disabled={availableZones.length === 0}
                      className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                    >
                      {field.value
                        ? availableZones.find((z) => z.id.toString() === field.value)
                          ? `${availableZones.find((z) => z.id.toString() === field.value)?.zone} • ${availableZones.find((z) => z.id.toString() === field.value)?.price
                          } {getCurrencySymbol()}`
                          : t("SelectZone")
                        : t("SelectZone")}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput placeholder={t("SearchZone")} autoFocus />
                    <CommandList>
                      <CommandEmpty>{t("NoZoneFound")}</CommandEmpty>
                      <CommandGroup>
                        {availableZones.map((zone) => (
                          <CommandItem
                            key={zone.id}
                            value={`${zone.zone} ${zone.price}`}
                            onSelect={() => field.onChange(zone.id.toString())}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                field.value === zone.id.toString() ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {zone.zone} • {zone.price} {getCurrencySymbol()}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Type - بقيت Select عادي لأن الخيارات قليلة */}
      <FormField
        control={form.control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("Type")}</FormLabel>
            <Select onValueChange={field.onChange} value={field.value || ""}>
              <FormControl>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("SelectType")} />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="home">{t("Home")}</SelectItem>
                <SelectItem value="work">{t("Work")}</SelectItem>
                <SelectItem value="other">{t("Other")}</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Additional Data */}
      <FormField
        control={form.control}
        name="additional_data"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("AdditionalData")}</FormLabel>
            <FormControl>
              <Input placeholder={t("AdditionalData")} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

export default AddressFormFields;