// scripts/fix-generated-schema.cjs
const fs = require("fs");
const path = require("path");

const file = path.join(__dirname, "..", "src", "lib", "db", "generated", "schema.ts");
let s = fs.readFileSync(file, "utf8");

function stripUnusedCockroachImports(t) {
  const regex =
    /import\s*{([^}]*)}\s*from\s*["']drizzle-orm\/cockroach-core["'];?/m;

  const m = t.match(regex);
  if (!m) return t;

  const inside = m[1];
  const parts = inside
    .split(",")
    .map((v) => v.trim())
    .filter((v) => v && v !== "primaryKey" && v !== "text");

  const replacement = `import { ${parts.join(", ")} } from "drizzle-orm/cockroach-core";`;

  return t.replace(regex, replacement);
}

function normalizeCascade(t) {
  return t
    .replace(/"CASCADE"/g, '"cascade"')
    .replace(/'CASCADE'/g, "'cascade'")
    .replace(/"SET NULL"/g, '"set null"')
    .replace(/'SET NULL'/g, "'set null'");
}

function fixRandomDefault(t) {
  return t.replace(/default\s*\(\s*random\s*\(\s*\)\s*\)/g, "default(sql`random()`)");
}

function ensureSqlImport(t) {
  if (!/sql`random\(\)`/.test(t)) return t;

  const importRegex =
    /import\s*{([^}]*)}\s*from\s*["']drizzle-orm["'];?/m;
  const m = t.match(importRegex);

  if (m) {
    const parts = m[1]
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean);

    if (parts.includes("sql")) return t;

    parts.push("sql");
    const newImport = `import { ${parts.join(", ")} } from "drizzle-orm";`;

    return t.replace(importRegex, newImport);
  }

  return `import { sql } from "drizzle-orm";\n${t}`;
}

// Apply fixes
s = stripUnusedCockroachImports(s);
s = normalizeCascade(s);
s = fixRandomDefault(s);
s = ensureSqlImport(s);

fs.writeFileSync(file, s);
console.log("✔ schema.ts post-generation fixes applied.");
