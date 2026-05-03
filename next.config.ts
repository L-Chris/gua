import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
