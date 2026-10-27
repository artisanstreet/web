import { defineConfig } from "vite-plus";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

// dashboard.artisan.st — TanStack Start on Vite+.
// SSR renders the public shell only; browser TanStack Query drives private
// account data against https://api.artisan.st with credentials:include
// (host-only HttpOnly cookie). Dev proxies /v1 to a local Core worker so
// cookie flows stay same-origin.
const CORE_DEV_URL = process.env.CORE_DEV_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  server: {
    port: 5101,
    proxy: {
      "/v1": { target: CORE_DEV_URL, changeOrigin: false },
      "/.well-known": { target: CORE_DEV_URL, changeOrigin: false },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2022",
  },
  plugins: [
    tanstackStart(),
    viteReact({
      babel: {
        plugins: [["babel-plugin-react-compiler", {}]],
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
