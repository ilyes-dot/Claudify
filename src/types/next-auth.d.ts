import type { DefaultSession } from "next-auth";

// Extends NextAuth's built-in types with the custom fields this app attaches
// to the session/JWT in src/lib/auth.ts, so `session.user.permissions` etc.
// are typed instead of requiring `as any` everywhere new code is written.
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleId: string;
      roleName: string;
      permissions: string[];
      mustChangePassword: boolean;
      invalid: boolean;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    roleId?: string;
    roleName?: string;
    permissions?: string[];
    mustChangePassword?: boolean;
    invalid?: boolean;
  }
}
