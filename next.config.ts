import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ...保持你原有的其他配置
  webpack: (config) => {
    // 忽略这些在客户端构建中不需要的库
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;