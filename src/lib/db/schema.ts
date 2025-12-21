/**
 * Database Schema
 *
 * This file re-exports the unified schema for the application.
 */

export * from "./schema/core";
export * from "./schema/teams";
export * from "./schema/assignments";

// Relations are still useful, but they might need manual updating if they reference removed tables.
// For now, let's keep them and see if they cause lint errors.
// export * from "./generated/relations";
