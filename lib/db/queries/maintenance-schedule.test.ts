import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestDb } from "../test-utils";

import { houseComponent } from "../schema";
import { createTestDb, seedTestUser, setupTestSchema } from "../test-utils";

// Mutable reference that the mock will use
const dbRef: { current: TestDb | null } = { current: null };

// Mock the db module with a proxy that reads from dbRef
vi.mock("..", () => ({
  default: new Proxy({}, {
    get(_, prop) {
      if (!dbRef.current) {
        throw new Error("Test database not initialized");
      }
      return (dbRef.current as Record<string, unknown>)[prop];
    },
  }),
}));

// Import after mock is set up
const {
  completeScheduledTask,
  createSchedule,
  deleteSchedule,
  getScheduleById,
  getSchedulesByHouseComponentId,
  getScheduleWithOwnership,
  updateSchedule,
} = await import("./maintenance-schedule");

// Helper to create a component for testing
async function seedComponent(userId: string, name = "Test Component") {
  const now = Date.now();
  const result = await dbRef.current!.insert(houseComponent).values({
    name,
    slug: name.toLowerCase().replaceAll(/\s+/g, "-"),
    description: null,
    userId,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return result[0];
}

describe("maintenance-schedule queries", () => {
  let userId: string;
  let componentId: number;

  beforeEach(async () => {
    dbRef.current = createTestDb();
    await setupTestSchema(dbRef.current);
    userId = await seedTestUser(dbRef.current);
    const component = await seedComponent(userId);
    componentId = component.id;
  });

  describe("createSchedule", () => {
    it("creates a schedule with calculated nextDueAt", async () => {
      const before = Date.now();
      const schedule = await createSchedule(componentId, {
        name: "Replace filter",
        description: "Use MERV 13",
        intervalDays: 90,
      });
      const after = Date.now();

      expect(schedule).toBeDefined();
      expect(schedule.name).toBe("Replace filter");
      expect(schedule.description).toBe("Use MERV 13");
      expect(schedule.intervalDays).toBe(90);
      expect(schedule.houseComponentId).toBe(componentId);

      // nextDueAt should be ~90 days from now
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      expect(schedule.nextDueAt).toBeGreaterThanOrEqual(before + ninetyDaysMs);
      expect(schedule.nextDueAt).toBeLessThanOrEqual(after + ninetyDaysMs);
    });

    it("creates the first pending task", async () => {
      const schedule = await createSchedule(componentId, {
        name: "Check furnace",
        description: null,
        intervalDays: 180,
      });

      // Query for the task that was created
      const tasks = await dbRef.current!.query.task.findMany({
        where: (fields, { eq }) => eq(fields.scheduleId, schedule.id),
      });

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("Check furnace");
      expect(tasks[0].status).toBe("pending");
      expect(tasks[0].dueAt).toBe(schedule.nextDueAt);
    });
  });

  describe("getSchedulesByHouseComponentId", () => {
    it("returns empty array when no schedules", async () => {
      const schedules = await getSchedulesByHouseComponentId(componentId);
      expect(schedules).toEqual([]);
    });

    it("returns schedules sorted by nextDueAt", async () => {
      await createSchedule(componentId, { name: "Yearly", description: null, intervalDays: 365 });
      await createSchedule(componentId, { name: "Monthly", description: null, intervalDays: 30 });
      await createSchedule(componentId, { name: "Quarterly", description: null, intervalDays: 90 });

      const schedules = await getSchedulesByHouseComponentId(componentId);

      expect(schedules).toHaveLength(3);
      expect(schedules[0].name).toBe("Monthly");
      expect(schedules[1].name).toBe("Quarterly");
      expect(schedules[2].name).toBe("Yearly");
    });
  });

  describe("getScheduleById", () => {
    it("returns schedule with houseComponent relation", async () => {
      const created = await createSchedule(componentId, {
        name: "Test Schedule",
        description: null,
        intervalDays: 30,
      });

      const schedule = await getScheduleById(created.id);

      expect(schedule).toBeDefined();
      expect(schedule!.name).toBe("Test Schedule");
      expect(schedule!.houseComponent).toBeDefined();
      expect(schedule!.houseComponent.id).toBe(componentId);
    });

    it("returns undefined for non-existent schedule", async () => {
      const schedule = await getScheduleById(99999);
      expect(schedule).toBeUndefined();
    });
  });

  describe("getScheduleWithOwnership", () => {
    it("returns schedule if user owns the component", async () => {
      const created = await createSchedule(componentId, {
        name: "My Schedule",
        description: null,
        intervalDays: 30,
      });

      const schedule = await getScheduleWithOwnership(created.id, userId);

      expect(schedule).toBeDefined();
      expect(schedule!.name).toBe("My Schedule");
    });

    it("returns null if user does not own the component", async () => {
      const otherUser = await seedTestUser(dbRef.current!, "other-user");
      const otherComponent = await seedComponent(otherUser, "Other");
      const created = await createSchedule(otherComponent.id, {
        name: "Their Schedule",
        description: null,
        intervalDays: 30,
      });

      const schedule = await getScheduleWithOwnership(created.id, userId);

      expect(schedule).toBeNull();
    });
  });

  describe("completeScheduledTask", () => {
    it("updates lastCompletedAt and nextDueAt", async () => {
      const schedule = await createSchedule(componentId, {
        name: "Filter",
        description: null,
        intervalDays: 90,
      });

      const completedAt = Date.now();
      const updated = await completeScheduledTask(schedule.id, completedAt);

      expect(updated).toBeDefined();
      expect(updated!.lastCompletedAt).toBe(completedAt);

      const expectedNextDue = completedAt + (90 * 24 * 60 * 60 * 1000);
      expect(updated!.nextDueAt).toBe(expectedNextDue);
    });

    it("creates a new pending task for next occurrence", async () => {
      const schedule = await createSchedule(componentId, {
        name: "Filter",
        description: null,
        intervalDays: 90,
      });

      const completedAt = Date.now();
      await completeScheduledTask(schedule.id, completedAt);

      // Should now have 2 tasks (original + new)
      const tasks = await dbRef.current!.query.task.findMany({
        where: (fields, { eq }) => eq(fields.scheduleId, schedule.id),
      });

      expect(tasks).toHaveLength(2);
      const pendingTasks = tasks.filter(t => t.status === "pending");
      expect(pendingTasks).toHaveLength(2); // Both are pending (we didn't complete the original task)
    });

    it("returns null for non-existent schedule", async () => {
      const result = await completeScheduledTask(99999, Date.now());
      expect(result).toBeNull();
    });
  });

  describe("updateSchedule", () => {
    it("updates schedule name and description", async () => {
      const created = await createSchedule(componentId, {
        name: "Old Name",
        description: "Old description",
        intervalDays: 30,
      });

      const updated = await updateSchedule(created.id, {
        name: "New Name",
        description: "New description",
      });

      expect(updated!.name).toBe("New Name");
      expect(updated!.description).toBe("New description");
      expect(updated!.intervalDays).toBe(30); // Unchanged
    });

    it("recalculates nextDueAt when interval changes", async () => {
      const created = await createSchedule(componentId, {
        name: "Test",
        description: null,
        intervalDays: 30,
      });

      const updated = await updateSchedule(created.id, {
        intervalDays: 60,
      });

      // Since lastCompletedAt is null, it should calculate from now
      const expectedNextDue = Date.now() + (60 * 24 * 60 * 60 * 1000);
      expect(updated!.nextDueAt).toBeGreaterThanOrEqual(expectedNextDue - 1000);
      expect(updated!.nextDueAt).toBeLessThanOrEqual(expectedNextDue + 1000);
    });

    it("updates pending task due dates when interval changes", async () => {
      const created = await createSchedule(componentId, {
        name: "Test",
        description: null,
        intervalDays: 30,
      });

      const updated = await updateSchedule(created.id, {
        intervalDays: 60,
      });

      // Get the pending task
      const tasks = await dbRef.current!.query.task.findMany({
        where: (fields, { eq }) => eq(fields.scheduleId, created.id),
      });

      expect(tasks[0].dueAt).toBe(updated!.nextDueAt);
    });

    it("returns null for non-existent schedule", async () => {
      const result = await updateSchedule(99999, { name: "New" });
      expect(result).toBeNull();
    });
  });

  describe("deleteSchedule", () => {
    it("deletes schedule and orphans tasks", async () => {
      const created = await createSchedule(componentId, {
        name: "Doomed",
        description: null,
        intervalDays: 30,
      });

      const deleted = await deleteSchedule(created.id);

      expect(deleted).toBeDefined();
      expect(deleted!.id).toBe(created.id);

      // Schedule should be gone
      const schedule = await getScheduleById(created.id);
      expect(schedule).toBeUndefined();

      // Task should still exist but with null scheduleId
      const tasks = await dbRef.current!.query.task.findMany({
        where: (fields, { eq }) => eq(fields.houseComponentId, componentId),
      });
      expect(tasks).toHaveLength(1);
      expect(tasks[0].scheduleId).toBeNull();
    });

    it("returns undefined for non-existent schedule", async () => {
      const deleted = await deleteSchedule(99999);
      expect(deleted).toBeUndefined();
    });
  });
});
