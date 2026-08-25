import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.ts", "client/src/**/*.spec.ts", "client/src/**/*.test.tsx", "client/src/**/*.spec.tsx", "companion/**/*.test.ts"],
    // Nilai uji deterministik untuk round-trip enkripsi OAuth state/token.
    // Bukan secret produksi; runtime nyata membaca JWT_SECRET dari env-nya sendiri.
    env: {
      JWT_SECRET: "vitest-deterministic-test-key-not-a-secret",
    },
  },
});
