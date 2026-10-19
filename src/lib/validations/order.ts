import { z } from "zod";

export const orderItemInputSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.coerce.number().int().positive(),
});

export const createOrderSchema = z.object({
  customerId: z.string().cuid("Select a customer."),
  items: z.array(orderItemInputSchema).min(1, "Add at least one product."),
  shipping: z.coerce.number().min(0).default(0),
  notes: z.string().trim().max(1000).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]),
});

export const orderListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.enum(["PENDING", "PAID", "SHIPPED", "DELIVERED", "CANCELLED", "REFUNDED"]).optional(),
  sortBy: z.enum(["orderNumber", "total", "createdAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
