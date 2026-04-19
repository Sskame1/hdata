import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  images: {
    domains: ['i.pinimg.com']
  },
  trailingSlash: true
};

export default nextConfig;
