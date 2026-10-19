import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(150),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(2000).optional(),
  sku: z.string().trim().max(50).optional(),
  price: z.coerce.number().positive("Price must be greater than 0."),
  compareAtPrice: z.coerce.number().positive().optional().nullable(),
  stock: z.coerce.number().int().min(0, "Stock cannot be negative."),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).default("DRAFT"),
  categoryId: z.string().cuid().optional().nullable(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

export const updateProductSchema = createProductSchema.partial();

export const productListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  categoryId: z.string().cuid().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  sortBy: z.enum(["name", "price", "stock", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export const createCategorySchema = z.object({
  name: z.string().trim().min(2).max(100),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens."),
  description: z.string().trim().max(500).optional(),
});
export const updateCategorySchema = createCategorySchema.partial();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type ProductListQuery = z.infer<typeof productListQuerySchema>;
