import { describe, it, expect } from "vitest";
import { passwordSchema, createUserSchema } from "@/lib/validations/user";

describe("passwordSchema", () => {
  it("rejects short passwords", () => {
    expect(passwordSchema.safeParse("short1!").success).toBe(false);
  });

  it("rejects passwords missing a symbol", () => {
    expect(passwordSchema.safeParse("NoSymbolsHere123").success).toBe(false);
  });

  it("accepts a strong password", () => {
    expect(passwordSchema.safeParse("Str0ng!Passw0rd").success).toBe(true);
  });
});

describe("createUserSchema", () => {
  it("lowercases and trims email", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "  Jane@Example.com  ",
      roleId: "cktest1234567890abcdefghi",
      password: "Str0ng!Passw0rd",
      status: "INVITED",
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("jane@example.com");
  });

  it("rejects an invalid email", () => {
    const result = createUserSchema.safeParse({
      name: "Jane Doe",
      email: "not-an-email",
      roleId: "cktest1234567890abcdefghi",
      password: "Str0ng!Passw0rd",
      status: "INVITED",
    });
    expect(result.success).toBe(false);
  });
});
