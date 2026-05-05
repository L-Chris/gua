import type { NextConfig } from "next";

const nextConfig: NextConfig = {
    output: "standalone",
    allowedDevOrigins: ["pi.tailc1b810.ts.net"],
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.hdslb.com",
            },
            {
                protocol: "http",
                hostname: "**.hdslb.com",
            },
        ],
    },
};

export default nextConfig;
