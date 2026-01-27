import type { InsertTaskImage } from "~~/lib/db/schema";

import { and, eq } from "drizzle-orm";

import db from "..";
import { taskImage } from "../schema";

export async function insertTaskImage(
  taskId: number,
  data: InsertTaskImage,
  userId: string,
) {
  const [inserted] = await db.insert(taskImage).values({
    ...data,
    taskId,
    userId,
  }).returning();

  return inserted;
}

export async function deleteTaskImage(
  imageId: number,
  userId: string,
) {
  const [deleted] = await db.delete(taskImage).where(
    and(eq(taskImage.id, imageId), eq(taskImage.userId, userId)),
  ).returning();

  return deleted;
}
