import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestDb } from "../test-utils";

import { houseComponent, task } from "../schema";
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
const { deleteTaskImage, insertTaskImage } = await import("./task-image");

// Helper to create a component for testing
async function seedComponent(userId: string) {
  const now = Date.now();
  const result = await dbRef.current!.insert(houseComponent).values({
    name: "Test Component",
    slug: "test-component",
    description: null,
    userId,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return result[0];
}

// Helper to create a task for testing
async function seedTask(componentId: number) {
  const result = await dbRef.current!.insert(task).values({
    title: "Test Task",
    description: null,
    houseComponentId: componentId,
    status: "pending",
    createdAt: Date.now(),
  }).returning();
  return result[0];
}

describe("task-image queries", () => {
  let userId: string;
  let taskId: number;

  beforeEach(async () => {
    dbRef.current = createTestDb();
    await setupTestSchema(dbRef.current);
    userId = await seedTestUser(dbRef.current);
    const component = await seedComponent(userId);
    const testTask = await seedTask(component.id);
    taskId = testTask.id;
  });

  describe("insertTaskImage", () => {
    it("inserts an image with all fields", async () => {
      const image = await insertTaskImage(
        taskId,
        {
          key: `${userId}/${taskId}/abc-123.jpg`,
          caption: "Before photo",
        },
        userId,
      );

      expect(image).toBeDefined();
      expect(image.taskId).toBe(taskId);
      expect(image.userId).toBe(userId);
      expect(image.key).toBe(`${userId}/${taskId}/abc-123.jpg`);
      expect(image.caption).toBe("Before photo");
      expect(image.createdAt).toBeDefined();
    });

    it("inserts an image without caption", async () => {
      const image = await insertTaskImage(
        taskId,
        {
          key: `${userId}/${taskId}/xyz-789.jpg`,
          caption: null,
        },
        userId,
      );

      expect(image.key).toBe(`${userId}/${taskId}/xyz-789.jpg`);
      expect(image.caption).toBeNull();
    });
  });

  describe("deleteTaskImage", () => {
    it("deletes image owned by user and returns it", async () => {
      const image = await insertTaskImage(
        taskId,
        {
          key: `${userId}/${taskId}/to-delete.jpg`,
          caption: null,
        },
        userId,
      );

      const deleted = await deleteTaskImage(image.id, userId);

      expect(deleted).toBeDefined();
      expect(deleted!.id).toBe(image.id);

      // Verify it's gone
      const remaining = await dbRef.current!.query.taskImage.findMany();
      expect(remaining).toHaveLength(0);
    });

    it("returns undefined when image does not exist", async () => {
      const deleted = await deleteTaskImage(99999, userId);
      expect(deleted).toBeUndefined();
    });

    it("cannot delete another user's image", async () => {
      const image = await insertTaskImage(
        taskId,
        {
          key: `${userId}/${taskId}/their-image.jpg`,
          caption: null,
        },
        userId,
      );

      const otherUser = await seedTestUser(dbRef.current!, "other-user");
      const deleted = await deleteTaskImage(image.id, otherUser);

      expect(deleted).toBeUndefined();

      // Verify image still exists
      const remaining = await dbRef.current!.query.taskImage.findMany();
      expect(remaining).toHaveLength(1);
    });
  });
});
