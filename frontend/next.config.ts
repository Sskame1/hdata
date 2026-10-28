/* Next.js конфиг.
   /sorting → /media (редирект).
   /api/backend/* → rewrite на backend :4000 (прокси для чтения/CRUD).
   Upload и админ-операции идут напрямую на BACKEND_BASE, минуя этот rewrite. */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/sorting", destination: "/media", permanent: false },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${process.env.API_PROXY ?? "http://backend:4000"}/:path*`,
      },
    ];
  },
};

export default nextConfig;
