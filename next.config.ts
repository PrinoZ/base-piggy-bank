import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ✅ 使用 Next.js 原生配置来处理外部依赖 (替代 webpack.externals)
  serverExternalPackages: [
    'pino', 
    'pino-pretty', 
    'lokijs', 
    'encoding', 
    '@walletconnect/utils'
  ],
};

export default nextConfig;