import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ✅ 新增：引入我们刚才创建的 Providers 组件
import { Providers } from './providers';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ⚠️ 重要：部署域名（默认指向 vercel 线上环境，可用 env 覆盖）
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://base-piggy-bank.vercel.app';

export const metadata: Metadata = {
  // 1. 基础信息
  title: "Base Piggy Bank",
  description: "Auto-invest USDC to cbBTC on Base. Simple, non-custodial DCA.",
  manifest: "/manifest.json", 
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png', 
  },

  // 2. 社交媒体预览 (Twitter/Discord/微信)
  openGraph: {
    title: "Base Piggy Bank 🐷",
    description: "Start your auto-investment journey on Base today!",
    url: APP_URL,
    siteName: "Base Piggy Bank",
    images: [
      {
        url: `${APP_URL}/og-image.png`, 
        width: 1200,
        height: 630,
        alt: "Base Piggy Bank Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },

  // 3. Twitter 卡片
  twitter: {
    card: "summary_large_image",
    title: "Base Piggy Bank 🐷",
    description: "Auto-invest USDC to cbBTC on Base.",
    images: [`${APP_URL}/og-image.png`],
  },

  // 4. ✅ Farcaster Frame (Base Mini App 核心交互配置)
  other: {
    "base:app_id": "693aa07d8a7c4e55fec73dfe",
    "fc:frame": "vNext",
    "fc:frame:image": `${APP_URL}/og-image.png`,
    "fc:frame:image:aspect_ratio": "1.91:1",
    "fc:frame:post_url": `${APP_URL}/api/frame`, 
    "fc:frame:button:1": "Launch Piggy Bank 🚀",
    "fc:frame:button:1:action": "link", 
    "fc:frame:button:1:target": APP_URL, 
  },
};

// 优化移动端视口体验
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, 
  themeColor: "#2563EB", 
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
      >
        {/* ✅ 关键修改：在这里包裹 Providers */}
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}