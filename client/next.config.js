/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Temporarily ignore TS errors during production builds
    ignoreBuildErrors: true,
  },
  eslint: {
    // Do not block builds on ESLint errors
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
};

module.exports = nextConfig;
