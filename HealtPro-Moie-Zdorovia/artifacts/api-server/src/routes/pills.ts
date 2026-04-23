import { Router, type IRouter } from "express";
import { db, pillsTable, pillsTakenTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const USER_ID = "local";

const pillSchema = z.object({
  name: z.string().min(1).max(200),
  dose: z.string().min(1).max(100),
  times: z.array(z.string()).default([]),
  days: z.array(z.string()).default([]),
  daily: z.boolean().default(true),
  startDate: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});

router.get("/pills", async (_req, res) => {
  const rows = await db.select().from(pillsTable).where(eq(pillsTable.userId, USER_ID));
  res.json(rows);
});

router.post("/pills", async (req, res) => {
  const parsed = pillSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", details: parsed.error.issues });
    return;
  }
  const v = parsed.data;
  const [row] = await db
    .insert(pillsTable)
    .values({
      userId: USER_ID,
      name: v.name,
      dose: v.dose,
      times: v.times,
      days: v.days,
      daily: v.daily ? "true" : "false",
      startDate: v.startDate ?? null,
      note: v.note ?? null,
    })
    .returning();
  res.status(201).json(row);
});

router.delete("/pills/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(pillsTable).where(eq(pillsTable.id, id));
  res.status(204).send();
});

const takenSchema = z.object({
  pillId: z.string(),
  takenDate: z.string(),
  takenAt: z.string(),
});

router.get("/pills-taken", async (_req, res) => {
  const rows = await db
    .select()
    .from(pillsTakenTable)
    .where(eq(pillsTakenTable.userId, USER_ID));
  res.json(rows);
});

router.post("/pills-taken", async (req, res) => {
  const parsed = takenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", details: parsed.error.issues });
    return;
  }
  const v = parsed.data;
  await db
    .insert(pillsTakenTable)
    .values({ userId: USER_ID, ...v })
    .onConflictDoNothing();
  res.status(201).json({ ok: true });
});

router.delete("/pills-taken", async (req, res) => {
  const parsed = takenSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", details: parsed.error.issues });
    return;
  }
  const v = parsed.data;
  await db
    .delete(pillsTakenTable)
    .where(
      and(
        eq(pillsTakenTable.userId, USER_ID),
        eq(pillsTakenTable.pillId, v.pillId),
        eq(pillsTakenTable.takenDate, v.takenDate),
        eq(pillsTakenTable.takenAt, v.takenAt),
      ),
    );
  res.status(204).send();
});

export default router;
