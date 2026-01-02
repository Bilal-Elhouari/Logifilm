import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "./",
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
  build: { outDir: "dist" },
  server: {
    hmr: {
      overlay: false, // Less intrusive errors
    },
    watch: {
      usePolling: false, // Reduce CPU usage on Windows
    },
  },
});
