/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    react(),
    dts({
      entryRoot: 'src',
      exclude: ['**/*.test.ts', '**/*.test.tsx', 'src/test-utils/**'],
      insertTypesEntry: true,
      outDir: 'dist',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(import.meta.dirname, 'src/index.ts'),
        data: resolve(import.meta.dirname, 'src/data.ts'),
        finance: resolve(import.meta.dirname, 'src/finance/index.ts'),
      },
      formats: ['es'],
      fileName: (_format, entryName) => `${entryName}.js`,
    },
    rollupOptions: {
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'react/jsx-dev-runtime',
        /^motion(?:\/|$)/,
        /^@number-flow\//,
        /^number-flow(?:\/|$)/,
        /^d3-/,
      ],
      output: {
        assetFileNames: 'styles.css',
      },
    },
    // Keep the npm download small; the TypeScript source is available in the repository.
    sourcemap: false,
    emptyOutDir: true,
  },
  test: {
    // Keep DOM-heavy chart tests within a predictable memory budget on contributor machines.
    maxWorkers: 4,
    // Every `m` element must sit under a MotionScope; see the guard.
    setupFiles: ['src/test-utils/motion-scope-guard.ts'],
  },
});
