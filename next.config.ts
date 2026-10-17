import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
const supabaseOrigin = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || "").origin;
  } catch {
    return "";
  }
})();

// Without nonces (pages are statically optimised); 'unsafe-eval' only in development per the
// Next.js CSP guide. Sources cover reCAPTCHA, Google Analytics/Maps, Paystack and Supabase.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/ https://www.googletagmanager.com https://js.paystack.co`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https://assets.mixkit.co",
  "font-src 'self' data:",
  `connect-src 'self' ${supabaseOrigin} https://www.google-analytics.com https://*.google-analytics.com https://www.google.com/recaptcha/`,
  "frame-src 'self' https://www.google.com https://maps.google.com https://js.paystack.co https://checkout.paystack.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.paystack.com",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
    // Next 16.2.1: a dev session restored from the Turbopack filesystem cache (default since 16.1)
    // stops matching dynamic [param] pages and API routes, which all return the 404 page until
    // .next/dev is deleted. Compile from scratch on each `next dev` instead.
    turbopackFileSystemCacheForDev: false,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(self)",
          },
        ],
      },
      {
        // Next 16 dev serves _clientMiddlewareManifest.js as JSON while loading it with a <script>
        // tag; nosniff turns that into a console error on every page. Development only.
        source: isDev ? "/:path((?!_next/static/development/).*)" : "/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }],
      },
    ];
  },
};

export default nextConfig;
