/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    }
  },
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  }
};

module.exports = nextConfig;


