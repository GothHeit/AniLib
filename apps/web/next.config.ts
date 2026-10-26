import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  transpilePackages: ["@app/api-client"],
  // The dev server would otherwise write an AGENTS.md into the app.
  agentRules: false,
};

export default createNextIntlPlugin()(nextConfig);
