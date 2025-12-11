import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 保持你原有的其他配置...
  webpack: (config) => {
    config.externals.push(
      'pino-pretty', 
      'lokijs', 
      'encoding',
      '@react-native-async-storage/async-storage' // 👈 新增这一行
    );
    return config;
  },
};

export default nextConfig;