import { defineConfig } from "drizzle-kit";

export default defineConfig({
  // When pulling schema, ignore the schema file since we're introspecting from DB
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/generated",
  dialect: "cockroach",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
  verbose: true,
  strict: true,
});
