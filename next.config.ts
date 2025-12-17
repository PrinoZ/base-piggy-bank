import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // 忽略这些在客户端构建中不需要的库
    if (Array.isArray(config.externals)) {
      config.externals.push('pino-pretty', 'lokijs', 'encoding');
    } else {
      config.externals = [config.externals, 'pino-pretty', 'lokijs', 'encoding'];
    }
    
    // 修复 MetaMask SDK 在浏览器/SSR 构建中尝试导入 React Native 依赖的问题
    // 注意：Next 可能会在 Server/Client 两侧的编译阶段都触发依赖解析，所以这里不要只放在 !isServer。
    const webpack = require('webpack');
    const path = require('path');

    // 确保 plugins 数组存在
    if (!config.plugins) {
      config.plugins = [];
    }

    // 1) Replace RN AsyncStorage everywhere
    config.plugins.push(
      new webpack.NormalModuleReplacementPlugin(
        /@react-native-async-storage\/async-storage/,
        path.resolve(__dirname, 'lib/empty-module.js')
      )
    );

    // 2) Replace MetaMask SDK everywhere (it drags RN deps)
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

    // 3) Alias + fallback as extra insurance
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
    
    return config;
  },
};

export default nextConfig;
