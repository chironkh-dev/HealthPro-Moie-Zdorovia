import { pgTable, serial, text, jsonb, timestamp, index, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const pillsTable = pgTable(
  "pills",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default("local"),
    name: text("name").notNull(),
    dose: text("dose").notNull(),
    times: jsonb("times").$type<string[]>().notNull().default([]),
    days: jsonb("days").$type<string[]>().notNull().default([]),
    daily: text("daily").notNull().default("true"),
    startDate: text("start_date"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("pills_user_idx").on(t.userId),
  }),
);

export const pillsTakenTable = pgTable(
  "pills_taken",
  {
    userId: text("user_id").notNull().default("local"),
    pillId: text("pill_id").notNull(),
    takenDate: text("taken_date").notNull(),
    takenAt: text("taken_at").notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.pillId, t.takenDate, t.takenAt] }),
  }),
);

export const insertPillSchema = createInsertSchema(pillsTable).omit({ id: true, createdAt: true });
export const selectPillSchema = createSelectSchema(pillsTable);
export const insertPillTakenSchema = createInsertSchema(pillsTakenTable).omit({ recordedAt: true });

export type InsertPill = z.infer<typeof insertPillSchema>;
export type Pill = typeof pillsTable.$inferSelect;
export type PillTaken = typeof pillsTakenTable.$inferSelect;
