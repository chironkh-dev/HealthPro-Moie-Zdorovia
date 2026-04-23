import { Router, type IRouter } from "express";
import { db, measurementsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const USER_ID = "local";

const createSchema = z.object({
  sys: z.coerce.number().int().min(40).max(300),
  dia: z.coerce.number().int().min(20).max(200),
  pulse: z.coerce.number().int().min(20).max(250),
  note: z.string().nullable().optional(),
  measuredAt: z.string().datetime().optional(),
});

router.get("/measurements", async (_req, res) => {
  const rows = await db
    .select()
    .from(measurementsTable)
    .where(eq(measurementsTable.userId, USER_ID))
    .orderBy(desc(measurementsTable.measuredAt));
  res.json(rows);
});

router.post("/measurements", async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", details: parsed.error.issues });
    return;
  }
  const v = parsed.data;
  const [row] = await db
    .insert(measurementsTable)
    .values({
      userId: USER_ID,
      sys: v.sys,
      dia: v.dia,
      pulse: v.pulse,
      note: v.note ?? null,
      measuredAt: v.measuredAt ? new Date(v.measuredAt) : new Date(),
    })
    .returning();
  res.status(201).json(row);
});

router.delete("/measurements/:id", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid id" });
    return;
  }
  await db.delete(measurementsTable).where(eq(measurementsTable.id, id));
  res.status(204).send();
});

export default router;
