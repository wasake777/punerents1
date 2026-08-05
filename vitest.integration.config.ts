import { defineConfig } from "vitest/config";
import path from "path";

// Integration tests hit a running server (see scripts/integration.sh), so
// they live in *.itest.ts files that the unit config's glob never matches.
export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.itest.ts"],
    testTimeout: 15_000,
  },
});
