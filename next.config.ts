import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Let phones on the home Wi-Fi use the dev server; otherwise Next blocks its dev scripts
  // for them and forms fall back to plain page posts (which can double-submit a join).
  allowedDevOrigins: ["192.168.4.21"],
  experimental: {
    // Proof photos are compressed in the browser, but leave headroom (Vercel caps requests at 4.5 MB).
    serverActions: { bodySizeLimit: "5mb" },
  },
};

export default nextConfig;
