import { z } from "zod";

export const createCustomerSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(150),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z.string().trim().max(30).optional(),
  address: z.string().trim().max(300).optional(),
  city: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
});
export const updateCustomerSchema = createCustomerSchema.partial();

export const customerListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(["name", "email", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
