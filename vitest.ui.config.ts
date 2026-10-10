import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Browser-side smoke tests. Worker tests run under vitest.config.ts.
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: { environment: "jsdom", include: ["test-ui/**/*.test.tsx"] },
});
