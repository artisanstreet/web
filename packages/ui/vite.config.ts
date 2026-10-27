import stylex from "@stylexjs/unplugin";
import { defineConfig } from "vite-plus";

export default defineConfig({
  plugins: [
    {
      ...stylex.vite({
        useCSSLayers: false,
        dev: process.env.NODE_ENV !== "production",
        runtimeInjection: false,
        devMode: "css-only",
        unstable_moduleResolution: { type: "commonJS" },
      }),
      ...(process.env.NODE_ENV === "test" ? { configureServer: undefined } : {}),
    },
  ],
  build: {
    lib: {
      entry: "src/index.ts",
      formats: ["es"],
      fileName: () => "index.js",
    },
    outDir: "dist",
    sourcemap: false,
    target: "es2022",
  },
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.{ts,tsx}"],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
