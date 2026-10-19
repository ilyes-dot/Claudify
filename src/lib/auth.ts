import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { notifyRole } from "@/lib/notify";

const MAX_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS ?? 5);
const LOCKOUT_MINUTES = Number(process.env.LOCKOUT_MINUTES ?? 15);
const SESSION_MAX_AGE = Number(process.env.SESSION_MAX_AGE ?? 8 * 60 * 60);

// NOTE on session strategy: NextAuth's Credentials provider only supports
// JWT sessions (there's no OAuth "account" row to back a database session).
// To still support near-instant revocation (e.g. suspending a user mid
// session), the jwt callback re-checks the user's status/role/permissions
// from the DB on every request.
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  pages: { signIn: "/login", error: "/login" },
  providers: [
    CredentialsProvider({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required.");
        }

        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });

        // Generic error regardless of which check fails — never reveal
        // whether an account exists (mitigates user enumeration).
        const genericError = "Invalid email or password.";

        if (!user || user.deletedAt) throw new Error(genericError);

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          throw new Error("Account temporarily locked due to failed attempts. Try again later.");
        }

        if (user.status !== "ACTIVE") {
          throw new Error("This account is not active. Contact your administrator.");
        }

        const validPassword = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!validPassword) {
          const attempts = user.failedLoginCount + 1;
          const shouldLock = attempts >= MAX_ATTEMPTS;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: shouldLock ? 0 : attempts,
              lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60 * 1000) : undefined,
            },
          });
          await logAudit({ actorId: user.id, action: "auth.login_failed", metadata: { attempts } });

          if (shouldLock) {
            await notifyRole("Super Admin", {
              title: "Account locked after repeated failed logins",
              body: `${user.email} was locked out for ${LOCKOUT_MINUTES} minutes after ${attempts} failed attempts.`,
              type: "WARNING",
            });
          }

          throw new Error(genericError);
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        await logAudit({ actorId: user.id, action: "auth.login_success" });

        return { id: user.id, email: user.email, name: user.name, image: user.image ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.id = (user as any).id;

      // Refresh role/permissions/status from the DB on every request. One
      // indexed lookup per request, but a role change, suspension, or
      // permission edit takes effect immediately instead of waiting for
      // the JWT to expire.
      if (token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        });

        if (!dbUser || dbUser.status !== "ACTIVE" || dbUser.deletedAt) {
          token.invalid = true;
          return token;
        }

        token.invalid = false;
        token.roleId = dbUser.roleId;
        token.roleName = dbUser.role.name;
        token.permissions = dbUser.role.permissions.map((rp) => rp.permission.key);
        token.mustChangePassword = dbUser.mustChangePassword;
        token.name = dbUser.name;
        token.email = dbUser.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).roleId = token.roleId;
        (session.user as any).roleName = token.roleName;
        (session.user as any).permissions = token.permissions ?? [];
        (session.user as any).mustChangePassword = token.mustChangePassword ?? false;
        (session.user as any).invalid = token.invalid ?? false;
      }
      return session;
    },
  },
  events: {
    async signOut({ token }) {
      if (token?.id) await logAudit({ actorId: token.id as string, action: "auth.logout" });
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
