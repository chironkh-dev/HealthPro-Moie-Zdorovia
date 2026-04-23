import { Router, type IRouter } from "express";
import { db, backupTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const USER_ID = "local";

router.get("/backup", async (_req, res) => {
  const [row] = await db.select().from(backupTable).where(eq(backupTable.userId, USER_ID));
  if (!row) {
    res.json({ state: null, version: 0, updatedAt: null });
    return;
  }
  res.json({ state: row.state, version: row.version, updatedAt: row.updatedAt });
});

const bodySchema = z.object({
  state: z.record(z.unknown()),
  version: z.number().int().nonnegative().optional(),
});

router.put("/backup", async (req, res) => {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "validation", details: parsed.error.issues });
    return;
  }
  const { state } = parsed.data;
  const [row] = await db
    .insert(backupTable)
    .values({ userId: USER_ID, state, version: 1 })
    .onConflictDoUpdate({
      target: backupTable.userId,
      set: {
        state,
        version: sql`${backupTable.version} + 1`,
        updatedAt: new Date(),
      },
    })
    .returning();
  res.json({ version: row.version, updatedAt: row.updatedAt });
});

export default router;
