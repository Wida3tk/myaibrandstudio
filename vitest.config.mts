import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    globals: true,
    // functions/ and worker/ are separate packages with their own vitest configs (different test
    // environment, their own node_modules) — verified by their own CI jobs, not this one.
    exclude: ["**/node_modules/**", "functions/**", "worker/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});
