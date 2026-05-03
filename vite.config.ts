import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Framework essentials
          if (id.includes('node_modules/react-router-dom') ||
              id.includes('node_modules/react-dom') ||
              (id.includes('node_modules/react/') && !id.includes('react-'))) {
            return 'vendor-react';
          }
          if (id.includes('node_modules/@tanstack/react-query')) {
            return 'vendor-query';
          }
          // Collapse all lucide-react icon files into one chunk
          // (otherwise each icon becomes its own ~1KB request, inflating
          // the network dependency tree dramatically).
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
        },
      },
    },
  },
}));
