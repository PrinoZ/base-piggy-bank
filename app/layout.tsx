import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// ✅ 新增：引入我们刚才创建的 Providers 组件
import { Providers } from './providers';
import type { ReactNode } from 'react';

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
  children: ReactNode;
}>) {
  // Render Base / Farcaster meta tags directly in <head> to guarantee exact
  // names like `fc:miniapp` (avoid any serialization quirks like `fc::miniapp`).
  // Farcaster requires a specific format for embed preview to work correctly.
  const miniappEmbed = {
    version: 'next',
    imageUrl: `${APP_URL}/miniapp-preview.png`,
    button: {
      title: 'Open App',
      action: {
        type: 'launch_frame',
        url: APP_URL,
        name: 'Base Piggy Bank',
        splashImageUrl: `${APP_URL}/icon-512.png`,
        splashBackgroundColor: '#2563EB',
      },
    },
  };

  return (
    <html lang="en">
      <head>
        {/* Base app ownership */}
        <meta name="base:app_id" content="693aa07d8a7c4e55fec73dfe" />

        {/* Farcaster Mini App embed metadata (required for Home URL Embed Preview) */}
        {/* Format must match Farcaster's expected structure exactly */}
        <meta name="fc:miniapp" content={JSON.stringify(miniappEmbed)} />
        
        {/* Additional OpenGraph tags for better embed preview support */}
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Base Piggy Bank" />

        {/* Farcaster Frame metadata (optional, kept for compatibility) */}
        <meta name="fc:frame" content="vNext" />
        <meta name="fc:frame:image" content={`${APP_URL}/og-image.png`} />
        <meta name="fc:frame:image:aspect_ratio" content="1.91:1" />
        <meta name="fc:frame:post_url" content={`${APP_URL}/api/frame`} />
        <meta name="fc:frame:button:1" content="Launch Piggy Bank 🚀" />
        <meta name="fc:frame:button:1:action" content="link" />
        <meta name="fc:frame:button:1:target" content={APP_URL} />
      </head>
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
