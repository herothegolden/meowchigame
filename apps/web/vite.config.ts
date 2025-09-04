import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: "0.0.0.0",
    port: 8080,
    allowedHosts: [
      ".up.railway.app" // allow any Railway subdomain
    ]
  }
});
