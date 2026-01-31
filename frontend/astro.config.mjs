// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  vite: {
    server: {
      fs: {
        allow: [
          // Allow serving files from the project root
          '.',
          // Allow serving files from node_modules
          '/mnt/c/Users/ingeb/projects/beta-code/beta-code/node_modules',
        ]
      }, // <-- Added comma here
      watch: {
        usePolling: true,
      }
    }
  }
})