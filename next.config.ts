import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Configure webpack to ignore Node.js modules in the browser
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        dns: false,
        child_process: false,
        worker_threads: false,
      };
    }
    return config;
  }
};

export default nextConfig;
