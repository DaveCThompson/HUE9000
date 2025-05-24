import { defineConfig } from 'vite';

export default defineConfig({
  base: '/HUE9000/', 
  build: {
    outDir: 'dist', // Default output directory for builds, usually 'dist'
    // If you need to explicitly tell Vite where your public assets are relative to your root
    // rollupOptions: {
    //   output: {
    //     assetFileNames: (assetInfo) => {
    //       if (assetInfo.name === 'logo.svg' || assetInfo.name === 'noise.svg' || assetInfo.name === 'metal-grill.png' || assetInfo.name === 'specular-highlights.svg' || assetInfo.name === 'crt-overlay.png' || assetInfo.name === 'favicon.ico') {
    //         return `assets/[name][extname]`; // Puts them directly in assets
    //       }
    //       return `assets/[name]-[hash][extname]`;
    //     },
    //   },
    // },
  },
  // ... any other Vite configurations you might have
});