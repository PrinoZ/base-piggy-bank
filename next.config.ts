import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 忽略这些在客户端构建中不需要的库
    if (Array.isArray(config.externals)) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    } else {
      config.externals = [config.externals, 'pino-pretty', 'lokijs', 'encoding'];
    }
    
    // 修复 MetaMask SDK 在浏览器环境中尝试导入 React Native 依赖的问题
    if (!isServer) {
      // 使用 webpack 的 NormalModuleReplacementPlugin 替换模块
      const webpack = require('webpack');
      const path = require('path');
      
      // 确保 plugins 数组存在
      if (!config.plugins) {
        config.plugins = [];
      }
      
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@react-native-async-storage\/async-storage/,
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );

      // MetaMask SDK itself is not needed for our app (we rely on injected wallets / Base / Farcaster).
      // Hard-alias it to an empty module to avoid it pulling React Native-only deps during build.
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^@metamask\/sdk$/,
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /@metamask\/sdk\/dist\/browser\/es\/metamask-sdk\.js/,
          path.resolve(__dirname, 'lib/empty-module.js')
        )
      );
      
      // 同时添加到 fallback 和 alias，确保完全忽略
      config.resolve = config.resolve || {};
      config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        '@react-native-async-storage/async-storage': false,
      };
      
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        '@react-native-async-storage/async-storage': path.resolve(__dirname, 'lib/empty-module.js'),
        '@metamask/sdk': path.resolve(__dirname, 'lib/empty-module.js'),
      };
      
      // 添加 IgnorePlugin 作为额外保障
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@react-native-async-storage\/async-storage$/,
        })
      );
      config.plugins.push(
        new webpack.IgnorePlugin({
          resourceRegExp: /^@metamask\/sdk$/,
        })
      );
    }
    
    return config;
  },
};

export default nextConfig;
