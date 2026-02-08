import { setup } from "@nuxt/test-utils/e2e";
import { beforeEach, describe, expect, it } from "vitest";

import type { ApiDeleteResponse, ApiHouseComponent, ApiHouseComponentDetail, ApiSchedule, ApiScheduleDetail, ApiTask, ApiTaskDetail } from "../helpers";

import {
  authenticatedFetch,
  authenticatedFetchWithStatus,
  loadTestEnv,
  resetDatabase,
  seedTestUser,
  setupTestDatabase,
  unauthenticatedFetchWithStatus,
} from "../helpers";

describe("Tasks API", async () => {
  loadTestEnv();
  await setupTestDatabase();
  await setup({
    server: true,
    nuxtConfig: {
      runtimeConfig: {
        testAuthBypass: true,
      },
    },
  });

  let componentSlug: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedTestUser("test-user-1");

    // Create a component to attach tasks to
    const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
      method: "POST",
      body: { name: "Furnace", description: null },
    });
    componentSlug = component.slug;
  });

  describe("POST /api/house-components/[slug]/tasks", () => {
    it("creates a task with all fields", async () => {
      const dueAt = Date.now() + 86400000;
      const task = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Replace filter", description: "Use MERV 13", dueAt },
      });

      expect(task.title).toBe("Replace filter");
      expect(task.description).toBe("Use MERV 13");
      expect(task.dueAt).toBe(dueAt);
      expect(task.status).toBe("pending");
    });

    it("creates a task with minimal fields", async () => {
      const task = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Simple task", description: null },
      });

      expect(task.title).toBe("Simple task");
      expect(task.description).toBeNull();
      expect(task.dueAt).toBeNull();
    });

    it("returns 404 for non-existent component", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components/not-real/tasks", {
        method: "POST",
        body: { title: "Test", description: null },
      });

      expect(status).toBe(404);
    });

    it("returns 422 for missing title", async () => {
      const { status } = await authenticatedFetchWithStatus(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { description: "No title" },
      });

      expect(status).toBe(422);
    });

    it("returns 401 without authentication", async () => {
      const { status } = await unauthenticatedFetchWithStatus(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Test", description: null },
      });

      expect(status).toBe(401);
    });
  });

  describe("GET /api/tasks/[id]", () => {
    it("returns task with relations", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Test Task", description: null },
      });

      const task = await authenticatedFetch<ApiTaskDetail>(`/api/tasks/${created.id}`);

      expect(task.title).toBe("Test Task");
      expect(task.houseComponent).toBeDefined();
      expect(task.houseComponent.slug).toBe(componentSlug);
      expect(task.images).toEqual([]);
    });

    it("returns 404 for non-existent task", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/99999");
      expect(status).toBe(404);
    });

    it("returns 400 for invalid task ID", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/not-a-number");
      expect(status).toBe(400);
    });

    it("returns 404 for another user's task", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherTask = await authenticatedFetch<ApiTask>(`/api/house-components/${otherComponent.slug}/tasks`, {
        method: "POST",
        body: { title: "Their Task", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/tasks/${otherTask.id}`);
      expect(status).toBe(404);
    });
  });

  describe("PUT /api/tasks/[id]", () => {
    it("updates task title", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Original", description: null },
      });

      const updated = await authenticatedFetch<ApiTask>(`/api/tasks/${created.id}`, {
        method: "PUT",
        body: { title: "Updated" },
      });

      expect(updated.title).toBe("Updated");
    });

    it("updates task description", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Task", description: null },
      });

      const updated = await authenticatedFetch<ApiTask>(`/api/tasks/${created.id}`, {
        method: "PUT",
        body: { description: "New description" },
      });

      expect(updated.description).toBe("New description");
    });

    it("returns 404 for non-existent task", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/99999", {
        method: "PUT",
        body: { title: "Updated" },
      });

      expect(status).toBe(404);
    });

    it("returns 400 for invalid task ID", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/abc", {
        method: "PUT",
        body: { title: "Updated" },
      });

      expect(status).toBe(400);
    });

    it("cannot update another user's task", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherTask = await authenticatedFetch<ApiTask>(`/api/house-components/${otherComponent.slug}/tasks`, {
        method: "POST",
        body: { title: "Their Task", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/tasks/${otherTask.id}`, {
        method: "PUT",
        body: { title: "Stolen" },
      });

      expect(status).toBe(404);
    });

    it("syncs dueAt change to parent schedule's nextDueAt", async () => {
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Filter check", description: null, intervalDays: 30 },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduledTask = component.tasks.find(t => t.scheduleId === schedule.id);

      const tomorrow = Date.now() + 24 * 60 * 60 * 1000;
      await authenticatedFetch<ApiTask>(`/api/tasks/${scheduledTask!.id}`, {
        method: "PUT",
        body: { dueAt: tomorrow },
      });

      const updatedSchedule = await authenticatedFetch<ApiScheduleDetail>(`/api/schedules/${schedule.id}`);
      expect(updatedSchedule.nextDueAt).toBe(tomorrow);
    });

    it("does not sync dueAt change for completed scheduled tasks", async () => {
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Filter check", description: null, intervalDays: 30 },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduledTask = component.tasks.find(t => t.scheduleId === schedule.id);

      await authenticatedFetch<ApiTask>(`/api/tasks/${scheduledTask!.id}/complete`, {
        method: "POST",
        body: { status: "completed" },
      });

      const scheduleAfterCompletion = await authenticatedFetch<ApiScheduleDetail>(`/api/schedules/${schedule.id}`);
      const nextDueAfterCompletion = scheduleAfterCompletion.nextDueAt;

      // Edit the completed task's dueAt — should NOT affect schedule
      const newDueAt = Date.now() + 5 * 24 * 60 * 60 * 1000;
      await authenticatedFetch<ApiTask>(`/api/tasks/${scheduledTask!.id}`, {
        method: "PUT",
        body: { dueAt: newDueAt },
      });

      const scheduleAfterEdit = await authenticatedFetch<ApiScheduleDetail>(`/api/schedules/${schedule.id}`);
      expect(scheduleAfterEdit.nextDueAt).toBe(nextDueAfterCompletion);
    });

    it("does not sync when editing only title on scheduled task", async () => {
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Filter check", description: null, intervalDays: 30 },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduledTask = component.tasks.find(t => t.scheduleId === schedule.id);

      await authenticatedFetch<ApiTask>(`/api/tasks/${scheduledTask!.id}`, {
        method: "PUT",
        body: { title: "Updated title" },
      });

      const updatedSchedule = await authenticatedFetch<ApiScheduleDetail>(`/api/schedules/${schedule.id}`);
      expect(updatedSchedule.nextDueAt).toBe(schedule.nextDueAt);
    });
  });

  describe("DELETE /api/tasks/[id]", () => {
    it("deletes task and returns success", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Doomed", description: null },
      });

      const result = await authenticatedFetch<ApiDeleteResponse>(`/api/tasks/${created.id}`, {
        method: "DELETE",
      });

      expect(result.success).toBe(true);

      // Verify it's gone
      const { status } = await authenticatedFetchWithStatus(`/api/tasks/${created.id}`);
      expect(status).toBe(404);
    });

    it("returns 404 for non-existent task", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/99999", {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });

    it("cannot delete another user's task", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherTask = await authenticatedFetch<ApiTask>(`/api/house-components/${otherComponent.slug}/tasks`, {
        method: "POST",
        body: { title: "Their Task", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/tasks/${otherTask.id}`, {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });
  });

  describe("POST /api/tasks/[id]/complete", () => {
    it("marks task as completed", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Task", description: null },
      });

      const completed = await authenticatedFetch<ApiTask>(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: { status: "completed" },
      });

      expect(completed.status).toBe("completed");
      expect(completed.completedAt).toBeDefined();
      expect(completed.completedAt).toBeGreaterThan(0);
    });

    it("marks task as skipped", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Task", description: null },
      });

      const skipped = await authenticatedFetch<ApiTask>(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: { status: "skipped" },
      });

      expect(skipped.status).toBe("skipped");
    });

    it("uses provided completedAt timestamp", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Task", description: null },
      });
      const customTime = 1234567890;

      const completed = await authenticatedFetch<ApiTask>(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: { status: "completed", completedAt: customTime },
      });

      expect(completed.completedAt).toBe(customTime);
    });

    it("triggers schedule rotation when completing scheduled task", async () => {
      // Create schedule (which auto-creates first task)
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Filter check", description: null, intervalDays: 90 },
      });

      // Get the auto-created task
      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduledTask = component.tasks.find(t => t.scheduleId === schedule.id);

      // Complete it
      await authenticatedFetch<ApiTask>(`/api/tasks/${scheduledTask!.id}/complete`, {
        method: "POST",
        body: { status: "completed" },
      });

      // Should have a new pending task for the next occurrence
      const updatedComponent = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduleTasks = updatedComponent.tasks.filter(t => t.scheduleId === schedule.id);

      expect(scheduleTasks.length).toBeGreaterThanOrEqual(2);
    });

    it("returns 422 for invalid status", async () => {
      const created = await authenticatedFetch<ApiTask>(`/api/house-components/${componentSlug}/tasks`, {
        method: "POST",
        body: { title: "Task", description: null },
      });

      const { status } = await authenticatedFetchWithStatus(`/api/tasks/${created.id}/complete`, {
        method: "POST",
        body: { status: "done" },
      });

      expect(status).toBe(422);
    });

    it("returns 404 for non-existent task", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/tasks/99999/complete", {
        method: "POST",
        body: { status: "completed" },
      });

      expect(status).toBe(404);
    });
  });
});
