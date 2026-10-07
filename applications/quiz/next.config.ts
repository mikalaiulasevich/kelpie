import type { NextConfig } from 'next';

const nextConfiguration: NextConfig = {
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [{ source: '/api/:path*', destination: 'http://127.0.0.1:3000/api/:path*' }];
  },
};

export default nextConfiguration;
