import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(() => {
  return {
    build: {
      outDir: "build",
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 8301,
      allowedHosts: [".apps-tunnel.monday.app"],
      proxy: {
        "/fragrances": "http://localhost:3001",
        "/webhooks": "http://localhost:3001",
        "/health": "http://localhost:3001",
      },
    },
  };
});
