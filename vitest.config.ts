import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: [
      // Co-located unit tests
      "lib/**/*.test.ts",
      "server/**/*.test.ts",
      "app/**/*.test.ts",
      // Integration and E2E tests
      "tests/**/*.test.ts",
    ],
    testTimeout: 10000,
    coverage: {
      provider: "v8",
      include: ["lib/**", "server/**", "app/components/**"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "lib/db/migrations/**"],
    },
  },
});
