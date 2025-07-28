/** @type {import('next').NextConfig} */
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: false, // 不自动跳过等待，让用户决定是否更新
  disable: process.env.NODE_ENV === 'development',
  buildExcludes: [/middleware-manifest\.json$/], // 避免一些常见的冲突文件
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
};

module.exports = withPWA(nextConfig); 