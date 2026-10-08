import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

const nextConfiguration: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: fileURLToPath(new URL('../..', import.meta.url)),
  cacheMaxMemorySize: 0,
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  async rewrites() {
    return [
      {
        source: '/api/administration/preview/:path*',
        destination: 'http://127.0.0.1:3000/api/:path*',
      },
      { source: '/api/:path*', destination: 'http://127.0.0.1:3000/api/:path*' },
    ];
  },
};

export default nextConfiguration;
