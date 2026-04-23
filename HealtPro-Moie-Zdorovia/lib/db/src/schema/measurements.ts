import { pgTable, serial, integer, text, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const measurementsTable = pgTable(
  "measurements",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull().default("local"),
    sys: integer("sys").notNull(),
    dia: integer("dia").notNull(),
    pulse: integer("pulse").notNull(),
    note: text("note"),
    measuredAt: timestamp("measured_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userMeasuredIdx: index("measurements_user_measured_idx").on(t.userId, t.measuredAt),
  }),
);

export const insertMeasurementSchema = createInsertSchema(measurementsTable).omit({
  id: true,
  createdAt: true,
});
export const selectMeasurementSchema = createSelectSchema(measurementsTable);

export type InsertMeasurement = z.infer<typeof insertMeasurementSchema>;
export type Measurement = typeof measurementsTable.$inferSelect;
