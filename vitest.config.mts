import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// .mts since session-019 (S19-01): vitest 5.1 loads a .ts config as CommonJS and warns
// ("configLoader: 'native' … planned to become the default in a future major version of
// Vite") — ESM-native .mts is the forward-compatible form. __dirname is unavailable in
// ESM; fileURLToPath(new URL(…)) stays portable across the whole Node ≥ 20 contract
// (import.meta.dirname would require 20.11+).
export default defineConfig({
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    setupFiles: ["tests/unit/setup.ts"],
  },
});
