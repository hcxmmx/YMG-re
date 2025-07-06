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
};

module.exports = withPWA(nextConfig); 