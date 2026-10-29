import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Proof photos are compressed in the browser, but leave headroom (Vercel caps requests at 4.5 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
