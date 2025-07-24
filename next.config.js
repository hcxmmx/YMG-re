/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  // 添加性能优化
  poweredByHeader: false,
  compress: true,
  images: {
    unoptimized: process.env.NODE_ENV === 'development',
  },
  // 减少不必要的重新渲染
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // 允许外部访问开发服务器
  webpack: (config, { isServer }) => {
    return config;
  },
  // 开发服务器配置
  devServer: {
    host: '0.0.0.0',
    allowedHosts: ['*'],
  }
};

module.exports = withPWA(nextConfig); 