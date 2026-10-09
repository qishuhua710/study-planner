import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "学习日程管理",
  description: "个性化学习日程管理 PWA — 日历 + 任务 + 计时器 + 学习辅助",
  manifest: "/manifest.json",
  openGraph: {
    title: "学习日程管理",
    description: "个性化学习日程管理 PWA — 日历 + 任务 + 计时器 + 学习辅助",
    type: "website",
    locale: "zh_CN",
    siteName: "学习日程",
  },
  twitter: {
    card: "summary_large_image",
    title: "学习日程管理",
    description: "个性化学习日程管理 PWA",
  },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
