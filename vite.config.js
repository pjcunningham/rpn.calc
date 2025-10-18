import { defineConfig } from 'vite';

// Vite configuration for GitHub Pages
// - base: './' ensures all asset links are relative so the site works under a subpath (e.g., /rpn.calc/)
// - build.outDir: 'docs' so GitHub Pages can serve directly from /docs
export default defineConfig({
  base: './',
  build: {
    outDir: 'docs'
  }
});
