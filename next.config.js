/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'presigned-url-uploads.almostcrackd.ai',
      },
    ],
  },
}

module.exports = nextConfig
