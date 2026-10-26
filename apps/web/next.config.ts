import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@app/api-client"],
};

export default createNextIntlPlugin()(nextConfig);
