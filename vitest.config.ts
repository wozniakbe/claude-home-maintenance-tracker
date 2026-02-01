import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      // Unit tests - run in parallel (default)
      {
        test: {
          name: "unit",
          include: [
            "lib/**/*.test.ts",
            "server/**/*.test.ts",
            "app/**/*.test.ts",
          ],
          testTimeout: 10000,
        },
      },
      // Integration tests - single thread, sequential (shared file-based SQLite)
      {
        test: {
          name: "integration",
          include: ["tests/**/*.test.ts"],
          testTimeout: 30000,
          pool: "threads",
          poolOptions: {
            threads: {
              singleThread: true,
            },
          },
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["lib/**", "server/**", "app/components/**"],
      exclude: ["**/*.d.ts", "**/*.test.ts", "lib/db/migrations/**"],
    },
  },
});
