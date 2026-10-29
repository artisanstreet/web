import { sveltekit } from "@sveltejs/kit/vite";
import { effect } from "svelte-effect-runtime/compiler";
import { defineConfig } from "vite-plus";

const core_dev_url = process.env.CORE_DEV_URL ?? "http://127.0.0.1:8787";

export default defineConfig({
  server: {
    port: 5201,
    proxy: {
      "/v1": { target: core_dev_url, changeOrigin: false },
      "/.well-known": { target: core_dev_url, changeOrigin: false },
    },
  },
  plugins: [
    ...effect(),
    sveltekit({
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
