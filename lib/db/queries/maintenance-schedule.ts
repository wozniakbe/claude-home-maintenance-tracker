import type { InsertMaintenanceSchedule, UpdateMaintenanceSchedule } from "~~/lib/db/schema";

import { and, eq } from "drizzle-orm";

import db from "..";
import { maintenanceSchedule, task } from "../schema";

export async function getSchedulesByHouseComponentId(houseComponentId: number) {
  return db.query.maintenanceSchedule.findMany({
    where: eq(maintenanceSchedule.houseComponentId, houseComponentId),
    orderBy: (fields, { asc }) => asc(fields.nextDueAt),
  });
}

export async function getScheduleById(scheduleId: number) {
  return db.query.maintenanceSchedule.findFirst({
    where: eq(maintenanceSchedule.id, scheduleId),
    with: {
      houseComponent: true,
    },
  });
}

export async function createSchedule(houseComponentId: number, data: InsertMaintenanceSchedule) {
  // Calculate the first due date from now
  const now = Date.now();
  const nextDueAt = now + (data.intervalDays * 24 * 60 * 60 * 1000);

  // Create the schedule
  const [schedule] = await db
    .insert(maintenanceSchedule)
    .values({
      ...data,
      houseComponentId,
      nextDueAt,
    })
    .returning();

  if (!schedule) {
    throw new Error("Failed to create schedule");
  }

  // Create the first pending task for this schedule
  await db.insert(task).values({
    houseComponentId,
    scheduleId: schedule.id,
    title: data.name,
    description: data.description,
    status: "pending",
    dueAt: nextDueAt,
  });

  return schedule;
}

// Helper to verify schedule belongs to user's house component
export async function getScheduleWithOwnership(scheduleId: number, userId: string) {
  return db.query.maintenanceSchedule.findFirst({
    where: eq(maintenanceSchedule.id, scheduleId),
    with: {
      houseComponent: true,
    },
  }).then((result) => {
    if (result && result.houseComponent.userId === userId) {
      return result;
    }
    return null;
  });
}

/**
 * Called when a scheduled task is completed.
 * Updates the schedule and creates the next occurrence task.
 */
export async function completeScheduledTask(scheduleId: number, completedAt: number) {
  // Get the schedule
  const schedule = await db.query.maintenanceSchedule.findFirst({
    where: eq(maintenanceSchedule.id, scheduleId),
  });

  if (!schedule) {
    return null;
  }

  // Calculate next due date from now (not from the previous due date)
  // This prevents "catch-up" tasks if someone completes late
  const nextDueAt = completedAt + (schedule.intervalDays * 24 * 60 * 60 * 1000);

  // Update the schedule
  const [updatedSchedule] = await db
    .update(maintenanceSchedule)
    .set({
      lastCompletedAt: completedAt,
      nextDueAt,
    })
    .where(eq(maintenanceSchedule.id, scheduleId))
    .returning();

  // Create the next task
  await db.insert(task).values({
    houseComponentId: schedule.houseComponentId,
    scheduleId: schedule.id,
    title: schedule.name,
    description: schedule.description,
    status: "pending",
    dueAt: nextDueAt,
  });

  return updatedSchedule;
}

export async function updateSchedule(scheduleId: number, data: UpdateMaintenanceSchedule) {
  // Get the current schedule to check if interval changed
  const current = await db.query.maintenanceSchedule.findFirst({
    where: eq(maintenanceSchedule.id, scheduleId),
  });

  if (!current) {
    return null;
  }

  const updates: UpdateMaintenanceSchedule & { nextDueAt?: number } = { ...data };

  // If interval changed, recalculate nextDueAt from lastCompletedAt (or now if never completed)
  if (data.intervalDays && data.intervalDays !== current.intervalDays) {
    const baseTime = current.lastCompletedAt ?? Date.now();
    updates.nextDueAt = baseTime + (data.intervalDays * 24 * 60 * 60 * 1000);

    // Also update any pending tasks for this schedule
    await db
      .update(task)
      .set({ dueAt: updates.nextDueAt })
      .where(and(
        eq(task.scheduleId, scheduleId),
        eq(task.status, "pending"),
      ));
  }

  const [updated] = await db
    .update(maintenanceSchedule)
    .set(updates)
    .where(eq(maintenanceSchedule.id, scheduleId))
    .returning();

  return updated;
}

export async function deleteSchedule(scheduleId: number) {
  // Orphan any tasks linked to this schedule (set scheduleId to null)
  // The tasks remain but are no longer tied to the schedule
  await db
    .update(task)
    .set({ scheduleId: null })
    .where(eq(task.scheduleId, scheduleId));

  // Delete the schedule
  const [deleted] = await db
    .delete(maintenanceSchedule)
    .where(eq(maintenanceSchedule.id, scheduleId))
    .returning();

  return deleted;
}
