import { pgTable, text, jsonb, timestamp, integer } from "drizzle-orm/pg-core";

export const backupTable = pgTable("backup", {
  userId: text("user_id").primaryKey().default("local"),
  state: jsonb("state").$type<Record<string, unknown>>().notNull().default({}),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Backup = typeof backupTable.$inferSelect;
