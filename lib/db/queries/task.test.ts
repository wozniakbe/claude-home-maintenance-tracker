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
  completeTask,
  createTask,
  deleteTask,
  getOverdueTasks,
  getPendingTaskCount,
  getRecentlyCompletedTasks,
  getTaskById,
  getTasksByHouseComponentId,
  getTaskWithOwnership,
  getUpcomingTasks,
  updateTask,
} = await import("./task");

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

describe("task queries", () => {
  let userId: string;
  let componentId: number;

  beforeEach(async () => {
    dbRef.current = createTestDb();
    await setupTestSchema(dbRef.current);
    userId = await seedTestUser(dbRef.current);
    const component = await seedComponent(userId);
    componentId = component.id;
  });

  describe("createTask", () => {
    it("creates a task with all fields", async () => {
      const dueAt = Date.now() + 86400000;
      const task = await createTask(componentId, {
        title: "Replace filter",
        description: "Use MERV 13",
        dueAt,
      });

      expect(task).toBeDefined();
      expect(task.title).toBe("Replace filter");
      expect(task.description).toBe("Use MERV 13");
      expect(task.dueAt).toBe(dueAt);
      expect(task.status).toBe("pending");
      expect(task.houseComponentId).toBe(componentId);
    });

    it("creates a task with minimal fields", async () => {
      const task = await createTask(componentId, {
        title: "Simple task",
        description: null,
      });

      expect(task.title).toBe("Simple task");
      expect(task.description).toBeNull();
      expect(task.dueAt).toBeNull();
    });
  });

  describe("getTasksByHouseComponentId", () => {
    it("returns empty array when no tasks", async () => {
      const tasks = await getTasksByHouseComponentId(componentId);
      expect(tasks).toEqual([]);
    });

    it("returns tasks for component sorted by createdAt desc", async () => {
      // Insert directly with explicit timestamps to test ordering
      const { task } = await import("../schema");
      const now = Date.now();
      await dbRef.current!.insert(task).values([
        { title: "First", description: null, houseComponentId: componentId, status: "pending", createdAt: now - 2000 },
        { title: "Second", description: null, houseComponentId: componentId, status: "pending", createdAt: now - 1000 },
        { title: "Third", description: null, houseComponentId: componentId, status: "pending", createdAt: now },
      ]);

      const tasks = await getTasksByHouseComponentId(componentId);

      expect(tasks).toHaveLength(3);
      expect(tasks[0].title).toBe("Third");
      expect(tasks[1].title).toBe("Second");
      expect(tasks[2].title).toBe("First");
    });

    it("only returns tasks for specified component", async () => {
      const otherComponent = await seedComponent(userId, "Other Component");
      await createTask(componentId, { title: "My Task", description: null });
      await createTask(otherComponent.id, { title: "Other Task", description: null });

      const tasks = await getTasksByHouseComponentId(componentId);

      expect(tasks).toHaveLength(1);
      expect(tasks[0].title).toBe("My Task");
    });
  });

  describe("getTaskById", () => {
    it("returns task with relations", async () => {
      const created = await createTask(componentId, {
        title: "Test Task",
        description: null,
      });

      const task = await getTaskById(created.id);

      expect(task).toBeDefined();
      expect(task!.title).toBe("Test Task");
      expect(task!.houseComponent).toBeDefined();
      expect(task!.images).toEqual([]);
    });

    it("returns undefined for non-existent task", async () => {
      const task = await getTaskById(99999);
      expect(task).toBeUndefined();
    });
  });

  describe("updateTask", () => {
    it("updates task title", async () => {
      const created = await createTask(componentId, {
        title: "Original",
        description: null,
      });

      const updated = await updateTask(created.id, { title: "Updated" });

      expect(updated.title).toBe("Updated");
    });

    it("clears completedAt when reverting to pending", async () => {
      const created = await createTask(componentId, {
        title: "Task",
        description: null,
      });
      await completeTask(created.id, { status: "completed" });

      const updated = await updateTask(created.id, { status: "pending" });

      expect(updated.status).toBe("pending");
      expect(updated.completedAt).toBeNull();
    });
  });

  describe("completeTask", () => {
    it("marks task as completed with timestamp", async () => {
      const created = await createTask(componentId, {
        title: "Task",
        description: null,
      });

      const completed = await completeTask(created.id, { status: "completed" });

      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeDefined();
      expect(completed.completedAt).toBeGreaterThan(0);
    });

    it("marks task as skipped", async () => {
      const created = await createTask(componentId, {
        title: "Task",
        description: null,
      });

      const skipped = await completeTask(created.id, { status: "skipped" });

      expect(skipped.status).toBe("skipped");
    });

    it("uses provided completedAt timestamp", async () => {
      const created = await createTask(componentId, {
        title: "Task",
        description: null,
      });
      const customTime = 1234567890;

      const completed = await completeTask(created.id, {
        status: "completed",
        completedAt: customTime,
      });

      expect(completed.completedAt).toBe(customTime);
    });
  });

  describe("deleteTask", () => {
    it("deletes task and returns it", async () => {
      const created = await createTask(componentId, {
        title: "Doomed",
        description: null,
      });

      const deleted = await deleteTask(created.id);

      expect(deleted.id).toBe(created.id);

      const tasks = await getTasksByHouseComponentId(componentId);
      expect(tasks).toHaveLength(0);
    });

    it("returns undefined for non-existent task", async () => {
      const deleted = await deleteTask(99999);
      expect(deleted).toBeUndefined();
    });
  });

  describe("getTaskWithOwnership", () => {
    it("returns task if user owns the component", async () => {
      const created = await createTask(componentId, {
        title: "My Task",
        description: null,
      });

      const task = await getTaskWithOwnership(created.id, userId);

      expect(task).toBeDefined();
      expect(task!.title).toBe("My Task");
    });

    it("returns null if user does not own the component", async () => {
      const otherUser = await seedTestUser(dbRef.current!, "other-user");
      const otherComponent = await seedComponent(otherUser, "Other Component");
      const created = await createTask(otherComponent.id, {
        title: "Their Task",
        description: null,
      });

      const task = await getTaskWithOwnership(created.id, userId);

      expect(task).toBeNull();
    });
  });

  describe("getOverdueTasks", () => {
    it("returns tasks past due date", async () => {
      const pastDue = Date.now() - 86400000;
      await createTask(componentId, {
        title: "Overdue",
        description: null,
        dueAt: pastDue,
      });

      const overdue = await getOverdueTasks(userId);

      expect(overdue).toHaveLength(1);
      expect(overdue[0].title).toBe("Overdue");
    });

    it("excludes completed tasks", async () => {
      const pastDue = Date.now() - 86400000;
      const task = await createTask(componentId, {
        title: "Completed Overdue",
        description: null,
        dueAt: pastDue,
      });
      await completeTask(task.id, { status: "completed" });

      const overdue = await getOverdueTasks(userId);

      expect(overdue).toHaveLength(0);
    });

    it("excludes other users' tasks", async () => {
      const otherUser = await seedTestUser(dbRef.current!, "other-user");
      const otherComponent = await seedComponent(otherUser, "Other");
      await createTask(otherComponent.id, {
        title: "Their Overdue",
        description: null,
        dueAt: Date.now() - 86400000,
      });

      const overdue = await getOverdueTasks(userId);

      expect(overdue).toHaveLength(0);
    });
  });

  describe("getUpcomingTasks", () => {
    it("returns tasks due within specified days", async () => {
      const tomorrow = Date.now() + 86400000;
      await createTask(componentId, {
        title: "Tomorrow",
        description: null,
        dueAt: tomorrow,
      });

      const upcoming = await getUpcomingTasks(userId, 7);

      expect(upcoming).toHaveLength(1);
      expect(upcoming[0].title).toBe("Tomorrow");
    });

    // Note: This test documents current behavior. The query uses eq(dueAt, null)
    // which translates to "= NULL" in SQL (always false). Tasks with no due date
    // are NOT included. Consider using isNull() if this should change.
    it("excludes tasks with no due date (current behavior)", async () => {
      await createTask(componentId, {
        title: "No deadline",
        description: null,
        dueAt: null,
      });

      const upcoming = await getUpcomingTasks(userId);

      expect(upcoming).toHaveLength(0);
    });

    it("excludes overdue tasks", async () => {
      await createTask(componentId, {
        title: "Overdue",
        description: null,
        dueAt: Date.now() - 86400000,
      });

      const upcoming = await getUpcomingTasks(userId);

      expect(upcoming).toHaveLength(0);
    });
  });

  describe("getRecentlyCompletedTasks", () => {
    it("returns completed and skipped tasks", async () => {
      const task1 = await createTask(componentId, { title: "Completed", description: null });
      const task2 = await createTask(componentId, { title: "Skipped", description: null });
      await completeTask(task1.id, { status: "completed" });
      await completeTask(task2.id, { status: "skipped" });

      const recent = await getRecentlyCompletedTasks(userId);

      expect(recent).toHaveLength(2);
    });

    it("respects limit parameter", async () => {
      for (let i = 0; i < 10; i++) {
        const task = await createTask(componentId, { title: `Task ${i}`, description: null });
        await completeTask(task.id, { status: "completed" });
      }

      const recent = await getRecentlyCompletedTasks(userId, 3);

      expect(recent).toHaveLength(3);
    });

    it("excludes pending tasks", async () => {
      await createTask(componentId, { title: "Pending", description: null });

      const recent = await getRecentlyCompletedTasks(userId);

      expect(recent).toHaveLength(0);
    });
  });

  describe("getPendingTaskCount", () => {
    it("counts pending tasks for user", async () => {
      await createTask(componentId, { title: "Pending 1", description: null });
      await createTask(componentId, { title: "Pending 2", description: null });
      const task3 = await createTask(componentId, { title: "Completed", description: null });
      await completeTask(task3.id, { status: "completed" });

      const count = await getPendingTaskCount(userId);

      expect(count).toBe(2);
    });

    it("excludes other users' tasks", async () => {
      const otherUser = await seedTestUser(dbRef.current!, "other-user");
      const otherComponent = await seedComponent(otherUser, "Other");
      await createTask(otherComponent.id, { title: "Their Task", description: null });

      const count = await getPendingTaskCount(userId);

      expect(count).toBe(0);
    });
  });
});
