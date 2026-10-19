/** @type {import('next').NextConfig} */
const securityHeaders = [
  // Prevent MIME-sniffing
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Clickjacking protection
  { key: "X-Frame-Options", value: "DENY" },
  // Restrict referrer leakage
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Disable powerful browser features by default
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // HSTS — only meaningful once served over HTTPS in production
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  // Baseline CSP — tighten per-deployment (e.g. add your API/CDN hosts).
  // 'unsafe-eval' is required in development only: Next.js's dev-mode
  // hot-reload (react-refresh) uses eval() internally. It is correctly
  // omitted in production builds, where no eval is needed.
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone", // required for the multi-stage Dockerfile
  poweredByHeader: false, // don't leak "X-Powered-By: Next.js"
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

module.exports = nextConfig;
