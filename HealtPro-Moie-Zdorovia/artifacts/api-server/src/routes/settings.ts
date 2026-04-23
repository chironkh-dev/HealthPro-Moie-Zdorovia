import { Router, type IRouter } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router: IRouter = Router();
const USER_ID = "local";

router.get("/settings", async (_req, res) => {
  const [row] = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.userId, USER_ID));
  res.json(row?.data ?? {});
});

router.put("/settings", async (req, res) => {
  const data = z.record(z.unknown()).parse(req.body ?? {});
  await db
    .insert(settingsTable)
    .values({ userId: USER_ID, data })
    .onConflictDoUpdate({
      target: settingsTable.userId,
      set: { data, updatedAt: new Date() },
    });
  res.json(data);
});

export default router;
