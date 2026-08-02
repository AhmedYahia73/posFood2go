//validation schemas for address and user forms
import { z } from "zod";

export const addressSchema = z.object({
  city_id: z.string().min(1, "City is required"),
  zone_id: z.string().min(1, "Zone is required"),
  address: z
    .string()
    .min(5, "Address is required and must be at least 5 characters."),
  street: z.string(),
  building_num: z.coerce.number().nullable().optional(),
  floor_num: z.coerce.number().nullable().optional(),
  apartment: z.coerce.number().nullable().optional(),
  additional_data: z.string().optional(),
  type: z.string().min(1, "Type is required."),
});

export const adduserSchema = addressSchema.extend({
  f_name: z.string().min(2, "First name must be at least 2 characters."),
  l_name: z.string().min(2, "Last name must be at least 2 characters."),
  phone: z.string().min(5, "Phone must be at least 5 characters."),
  phone_2: z.string().optional(),
});