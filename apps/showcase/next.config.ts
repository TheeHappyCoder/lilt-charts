import { resolve } from 'node:path';
import type { NextConfig } from 'next';

const packageSource = resolve(process.cwd(), '../../packages/charts/src');

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Lets other devices on the local network load the dev server's scripts (development only).
  allowedDevOrigins: ['10.0.0.122'],
  // The registry's package.json exports its TypeScript source, so it needs no alias.
  transpilePackages: ['@lilt-ui/charts', '@lilt-ui/registry'],
  // Interface pieces and text effects are drawn in type, so they moved back from Components to
  // ASCII; old links still land.
  async redirects() {
    return [
      'loader',
      'frame',
      'transition',
      'cursor-trail',
      'counter',
      'empty-state',
      'countdown',
      'dissolve',
      'logo-cloud',
      'log',
      'status',
      'scroll-meter',
      'scramble',
      'terminal',
      'glitch',
      'split-flap',
      'redact',
      'wave',
      'spotlight',
      'particle-word',
    ].map((slug) => ({
      source: `/components/${slug}`,
      destination: `/ascii/${slug}`,
      permanent: true,
    }));
  },
  turbopack: {
    resolveAlias: {
      '@lilt-ui/charts/finance': '../../packages/charts/src/finance/index.ts',
      '@lilt-ui/charts': '../../packages/charts/src/index.ts',
      '@lilt-ui/charts/styles.css': '../../packages/charts/src/styles.css',
    },
  },
  webpack(config, { dev }) {
    if (dev) {
      config.resolve.alias = {
        ...config.resolve.alias,
        '@lilt-ui/charts/finance': resolve(packageSource, 'finance/index.ts'),
        '@lilt-ui/charts$': resolve(packageSource, 'index.ts'),
        '@lilt-ui/charts/styles.css': resolve(packageSource, 'styles.css'),
      };
    }
    return config;
  },
};

export default nextConfig;
