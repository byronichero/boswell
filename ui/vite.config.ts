import path from "node:path";
import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Proxies to the memgraph-lab Compose service (or host-published Lab when developing without Docker UI). */
const memgraphLabProxyTarget =
  process.env.MEMGRAPH_LAB_PROXY_TARGET ?? "http://127.0.0.1:3000";

const memgraphLabProxy = {
  target: memgraphLabProxyTarget,
  changeOrigin: true,
  ws: true,
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": { target: "http://backend:8000", changeOrigin: true },
      "/health": { target: "http://backend:8000", changeOrigin: true },
      "/memgraph-lab": memgraphLabProxy,
    },
  },
  preview: {
    port: 5173,
    proxy: {
      "/api": { target: "http://backend:8000", changeOrigin: true },
      "/health": { target: "http://backend:8000", changeOrigin: true },
      "/memgraph-lab": memgraphLabProxy,
    },
  },
});
