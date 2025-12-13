import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 忽略这些在客户端构建中不需要的库
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // 修复 MetaMask SDK 在浏览器环境中尝试导入 React Native 依赖的问题
    if (!isServer) {
      // 将 React Native 的 async-storage 替换为空模块（浏览器环境不需要）
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@react-native-async-storage/async-storage': require.resolve('./lib/empty-module.js'),
      };
    }
    
    return config;
  },
};

export default nextConfig;