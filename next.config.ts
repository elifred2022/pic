import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@supabase/ssr",
    "@supabase/supabase-js",
    "@supabase/auth-js",
  ],
};

export default nextConfig;
