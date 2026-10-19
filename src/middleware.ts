import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;

    // Token flagged invalid by the jwt callback (user suspended/deleted
    // after the JWT was issued) — force a fresh sign-in.
    if (token?.invalid) {
      const signInUrl = new URL("/login", req.url);
      signInUrl.searchParams.set("reason", "session_expired");
      return NextResponse.redirect(signInUrl);
    }

    // Force password rotation before allowing access to anything else —
    // but never redirect API routes (they must return JSON, not an HTML
    // redirect). Exempt both the page itself and its backing API route.
    const isChangePasswordRoute =
      req.nextUrl.pathname.startsWith("/account/change-password") ||
      req.nextUrl.pathname.startsWith("/api/account/change-password") ||
      req.nextUrl.pathname.startsWith("/api/auth");

    if (token?.mustChangePassword && !isChangePasswordRoute) {
      return NextResponse.redirect(new URL("/account/change-password", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: { signIn: "/login" },
    // Must be passed explicitly here — without it, this middleware
    // (which runs in the Edge runtime, separate from the API routes)
    // can fail to decode the session token even though it's valid,
    // causing an authenticated user to be bounced back to /login.
    secret: process.env.NEXTAUTH_SECRET,
  }
);

export const config = {
  // Protect everything except the login page, the public invite-acceptance
  // flow (for brand-new users who have no session yet), auth API, static
  // assets, and the public health-check endpoint.
  matcher: [
    "/((?!login|invite|api/auth|api/invite|_next/static|_next/image|favicon.ico|api/health).*)",
  ],
};
