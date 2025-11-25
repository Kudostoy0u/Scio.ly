import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      exclude: [
        "node_modules/",
        "src/**/*.test.{ts,tsx}",
        "src/**/__tests__/**",
        "**/*.d.ts",
        "**/*.config.{js,ts}",
        "**/mockData/**",
        "**/test-utils/**",
        "vitest.setup.ts",
      ],
      include: [
        "src/app/api/teams/**/*.ts",
        "src/app/teams/components/**/*.tsx",
        "src/lib/services/team-data.ts",
        "src/lib/services/notification-sync.ts",
      ],
      all: true,
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100,
    },
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@/": path.resolve(__dirname, "./src/"),
    },
  },
});
