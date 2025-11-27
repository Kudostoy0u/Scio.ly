import path from "node:path";
import { defineConfig } from "vitest/config";

const maxThreads = Number(process.env.VITEST_MAX_THREADS ?? "4");
const coverageEnabled = process.env.VITEST_COVERAGE === "true";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    css: false,
    globals: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      enabled: coverageEnabled,
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
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads,
      },
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
      "@components": path.resolve(__dirname, "./src/app/components"),
      "@app": path.resolve(__dirname, "./src/app"),
      "@lib": path.resolve(__dirname, "./src/lib"),
      "@utils": path.resolve(__dirname, "./src/lib/utils"),
      "@app-utils": path.resolve(__dirname, "./src/app/utils"),
      "@test-utils": path.resolve(__dirname, "./src/test-utils"),
    },
  },
});
