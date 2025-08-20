/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // No custom bundler overrides; rely on runtime path resolution
  experimental: {
    serverActions: {
      bodySizeLimit: '50mb'
    },
    outputFileTracingIncludes: {
      // Ensure ffmpeg/ffprobe binaries are bundled with the serverless function
      "app/api/upload-direct/route.ts": [
        "node_modules/ffmpeg-static/ffmpeg",
        "node_modules/ffprobe-static/bin/*"
      ],
      "app/api/upload/route.ts": [
        "node_modules/ffmpeg-static/ffmpeg",
        "node_modules/ffprobe-static/bin/*"
      ]
    }
  }
};

module.exports = nextConfig;


