import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "华强买瓜素材雷达",
    description:
        "聚合 B 站华强买瓜相关视频数据，帮助相关 Up 主快速找灵感、看趋势、挑样本。",
    keywords: ["B站", "华强买瓜", "鬼畜", "二创", "视频统计", "创作灵感"],
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>) {
    return (
        <html
            lang="zh-CN"
            className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
            suppressHydrationWarning
        >
            <body className="min-h-full bg-background text-foreground">
                {children}
            </body>
        </html>
    );
}
