import type { CompleteTask, InsertTask, UpdateTask } from "~~/lib/db/schema";

import { and, count, eq, gt, inArray, lt, lte, ne, or } from "drizzle-orm";

import db from "..";
import { houseComponent, task } from "../schema";

function userComponentIds(userId: string) {
  return db.select({ id: houseComponent.id }).from(houseComponent).where(eq(houseComponent.userId, userId));
}

export async function getTasksByHouseComponentId(houseComponentId: number) {
  return db.query.task.findMany({
    where: eq(task.houseComponentId, houseComponentId),
    orderBy: (fields, { desc }) => desc(fields.createdAt),
  });
}

export async function getTaskById(taskId: number) {
  return db.query.task.findFirst({
    where: eq(task.id, taskId),
    with: {
      images: true,
      houseComponent: true,
    },
  });
}

export async function createTask(houseComponentId: number, data: InsertTask) {
  const [created] = await db
    .insert(task)
    .values({ ...data, houseComponentId })
    .returning();

  return created;
}

export async function updateTask(taskId: number, data: UpdateTask) {
  // If reverting to pending, clear the completedAt timestamp
  const updateData = data.status === "pending"
    ? { ...data, completedAt: null }
    : data;

  const [updated] = await db
    .update(task)
    .set(updateData)
    .where(eq(task.id, taskId))
    .returning();

  return updated;
}

export async function completeTask(taskId: number, data: CompleteTask) {
  const completedAt = data.completedAt ?? Date.now();

  const [updated] = await db
    .update(task)
    .set({
      status: data.status,
      completedAt,
    })
    .where(eq(task.id, taskId))
    .returning();

  return updated;
}

export async function deleteTask(taskId: number) {
  const [deleted] = await db
    .delete(task)
    .where(eq(task.id, taskId))
    .returning();

  return deleted;
}

// Helper to verify task belongs to user's house component
export async function getTaskWithOwnership(taskId: number, userId: string) {
  return db.query.task.findFirst({
    where: eq(task.id, taskId),
    with: {
      houseComponent: true,
      images: true,
    },
  }).then((result) => {
    if (result && result.houseComponent.userId === userId) {
      return result;
    }
    return null;
  });
}

// Dashboard queries - get tasks for a user across all their components

export async function getOverdueTasks(userId: string) {
  const now = Date.now();

  return db.query.task.findMany({
    where: and(
      eq(task.status, "pending"),
      lt(task.dueAt, now),
      inArray(task.houseComponentId, userComponentIds(userId)),
    ),
    with: {
      houseComponent: true,
    },
    orderBy: (fields, { asc }) => asc(fields.dueAt),
  });
}

export async function getUpcomingTasks(userId: string, days: number = 7) {
  const now = Date.now();
  const futureDate = now + (days * 24 * 60 * 60 * 1000);

  return db.query.task.findMany({
    where: and(
      eq(task.status, "pending"),
      inArray(task.houseComponentId, userComponentIds(userId)),
      or(
        // Tasks with due date in the next N days
        and(
          gt(task.dueAt, now),
          lte(task.dueAt, futureDate),
        ),
        // Tasks with no due date (show in upcoming as "anytime")
        eq(task.dueAt, null),
      ),
    ),
    with: {
      houseComponent: true,
    },
    orderBy: (fields, { asc }) => asc(fields.dueAt),
  });
}

export async function getRecentlyCompletedTasks(userId: string, limit: number = 5) {
  return db.query.task.findMany({
    where: and(
      ne(task.status, "pending"),
      inArray(task.houseComponentId, userComponentIds(userId)),
    ),
    with: {
      houseComponent: true,
    },
    orderBy: (fields, { desc }) => desc(fields.completedAt),
    limit,
  });
}

export async function getPendingTaskCount(userId: string) {
  const result = await db
    .select({ count: count() })
    .from(task)
    .where(and(
      eq(task.status, "pending"),
      inArray(task.houseComponentId, userComponentIds(userId)),
    ));

  return result[0].count;
}
