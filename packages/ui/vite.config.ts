import { defineConfig } from "vite-plus";

export default defineConfig({
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
