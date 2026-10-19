import { z } from "zod";

// Strong password policy — mirrors OWASP ASVS guidance:
// min 12 chars, at least one upper, one lower, one digit, one symbol.
export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters.")
  .max(128, "Password is too long.")
  .regex(/[a-z]/, "Password must include a lowercase letter.")
  .regex(/[A-Z]/, "Password must include an uppercase letter.")
  .regex(/[0-9]/, "Password must include a number.")
  .regex(/[^a-zA-Z0-9]/, "Password must include a symbol.");

export const createUserSchema = z.object({
  name: z.string().trim().min(2, "Name is too short.").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  roleId: z.string().cuid("Select a valid role."),
  // Optional: if omitted, the API generates a random unguessable password
  // (never revealed to anyone) and emails the user an invite link to set
  // their own. If provided, the admin is setting a temporary password
  // directly instead (useful when email isn't configured).
  password: z.union([passwordSchema, z.literal("")]).optional(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]).default("INVITED"),
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  roleId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]).optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required."),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const userListQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  roleId: z.string().cuid().optional(),
  status: z.enum(["ACTIVE", "INVITED", "SUSPENDED", "DISABLED"]).optional(),
  sortBy: z.enum(["name", "email", "createdAt", "lastLoginAt"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserListQuery = z.infer<typeof userListQuerySchema>;
