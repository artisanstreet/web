import { sveltekit } from "@sveltejs/kit/vite";
import { effect } from "svelte-effect-runtime/compiler";
import { defineConfig } from "vite-plus";
import { csp_directives } from "./src/lib/content-security.ts";

const core_dev_url = process.env.CORE_DEV_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  server: {
    port: Number(process.env.PORT ?? 5101),
    host: process.env.HOST ?? "0.0.0.0",
    allowedHosts: ["artisan.localhost", "auth.artisan.localhost"],
    fs: { allow: ["../.."] },
    proxy: {
      "/v1": { target: core_dev_url, changeOrigin: false, proxyTimeout: 10000 },
      "/.well-known": { target: core_dev_url, changeOrigin: false, proxyTimeout: 10000 },
    },
  },
  plugins: [
    ...effect(),
    sveltekit({
      csp: {
        mode: "auto",
        directives: csp_directives,
      },
      compilerOptions: {
        experimental: {
          async: true,
        },
      },
    }),
  ],
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
  },
});
