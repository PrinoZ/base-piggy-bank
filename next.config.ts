import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 忽略这些在客户端构建中不需要的库
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    
    // 修复 MetaMask SDK 在浏览器环境中尝试导入 React Native 依赖的问题
    if (!isServer) {
      // 使用 webpack 的 NormalModuleReplacementPlugin 替换模块
      const webpack = require('webpack');
      const path = require('path');
      
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@react-native-async-storage\/async-storage/,
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );
      
      // 同时添加到 fallback 和 alias，确保完全忽略
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        '@react-native-async-storage/async-storage': false,
      };
      
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'lib/empty-module.js'),
      };
    }
    
    return config;
  },
};

export default nextConfig;
