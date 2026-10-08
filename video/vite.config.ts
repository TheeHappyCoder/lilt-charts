import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const dist = here('./.lilt/dist');
const modules = here('./.lilt/node_modules');

// The film renders against a snapshot of the built package (`.lilt/dist`), so work elsewhere in
// the repo never changes a render halfway through.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: /^@lilt-ui\/charts\/finance$/, replacement: `${dist}/finance.js` },
      { find: /^@lilt-ui\/charts\/styles\.css$/, replacement: `${dist}/styles.css` },
      { find: /^@lilt-ui\/charts$/, replacement: `${dist}/index.js` },
      { find: /^react-dom(\/.*)?$/, replacement: `${modules}/react-dom$1` },
      { find: /^react(\/.*)?$/, replacement: `${modules}/react$1` },
      { find: /^motion(\/.*)?$/, replacement: `${modules}/motion$1` },
    ],
    dedupe: ['react', 'react-dom', 'motion'],
  },
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: false },
});
