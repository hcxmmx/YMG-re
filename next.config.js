/** @type {import('next').NextConfig} */

// 读取package.json获取版本号
const packageJson = require('./package.json');

const nextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: packageJson.version,
  },
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
};

module.exports = nextConfig;