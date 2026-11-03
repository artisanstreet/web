import { sveltekit } from "@sveltejs/kit/vite";
import { effect } from "svelte-effect-runtime/compiler";
import { defineConfig } from "vite-plus";
import { csp_directives } from "./src/lib/content-security.ts";

const core_dev_url = process.env.CORE_DEV_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  server: {
    port: 5201,
    fs: { allow: ["../.."] },
    proxy: {
      "/v1": { target: core_dev_url, changeOrigin: false },
      "/.well-known": { target: core_dev_url, changeOrigin: false },
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
  },
});
