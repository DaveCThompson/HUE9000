import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // This is the base path of your repository on GitHub Pages
  base: '/HUE9000/', 
  build: {
    // You can configure build options here if needed
  },
  // The public directory is served as-is at the root in dev,
  // and its contents are copied to the root of the 'dist' folder on build.
  // No special configuration is needed for it.
});