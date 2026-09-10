import { defineConfig } from 'vite';

// The shell is built two ways: relative-base for the package's own dist, and
// under the landing site at /<repo>/play/ for GitHub Pages (PLAY_BASE and
// PLAY_OUT are set by the root `build:play` script).
export default defineConfig({
  base: process.env.PLAY_BASE ?? './',
  build: { outDir: process.env.PLAY_OUT ?? 'dist', emptyOutDir: true },
  server: {
    proxy: {
      '/ollama': {
        target: 'http://127.0.0.1:11434',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ''),
      },
    },
  },
});
