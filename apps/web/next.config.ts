import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@nexusdialer/types', '@nexusdialer/utils'],
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_URL || 'http://localhost:4000'}/api/v1/:path*`,
      },
    ];
  },
};

export default nextConfig;
