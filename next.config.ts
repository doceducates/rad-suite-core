import type { NextConfig } from 'next';

const isDesktopBuild = process.env.BUILD_TARGET === 'desktop' || process.env.IS_DESKTOP_BUILD === '1';

const nextConfig: NextConfig = {
  ...(isDesktopBuild
    ? {
        output: 'standalone',
        outputFileTracingExcludes: {
          '*': [
            './db_backups/**',
            './src-tauri/**',
            './docs/**',
            './storage/**',
            './tests/**',
            './scratch/**',
            './.git/**',
            './*.zip',
            './*.tar.gz',
            './*.db*',
          ],
        },
      }
    : {}),
  serverExternalPackages: ['pg', 'better-sqlite3', 'bcryptjs', 'drizzle-orm'],
  typescript: {
    ignoreBuildErrors: true,
  },
  async rewrites() {
    const gatewayTarget = process.env.HMIS_GATEWAY_URL || 'http://localhost:3788';
    return [
      {
        source: '/hmis-api/:path*',
        destination: `${gatewayTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
