import { setup } from "@nuxt/test-utils/e2e";
import { beforeEach, describe, expect, it } from "vitest";

import type { ApiDeleteResponse, ApiHouseComponent, ApiHouseComponentDetail, ApiSchedule, ApiScheduleDetail, ApiTaskDetail } from "../helpers";

import {
  authenticatedFetch,
  authenticatedFetchWithStatus,
  loadTestEnv,
  resetDatabase,
  seedTestUser,
  setupTestDatabase,
  unauthenticatedFetchWithStatus,
} from "../helpers";

describe("Schedules API", async () => {
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

    const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
      method: "POST",
      body: { name: "Furnace", description: null },
    });
    componentSlug = component.slug;
  });

  describe("POST /api/house-components/[slug]/schedules", () => {
    it("creates a schedule with calculated nextDueAt", async () => {
      const before = Date.now();
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Replace filter", description: "Use MERV 13", intervalDays: 90 },
      });
      const after = Date.now();

      expect(schedule.name).toBe("Replace filter");
      expect(schedule.description).toBe("Use MERV 13");
      expect(schedule.intervalDays).toBe(90);

      // nextDueAt should be ~90 days from now
      const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
      expect(schedule.nextDueAt).toBeGreaterThanOrEqual(before + ninetyDaysMs);
      expect(schedule.nextDueAt).toBeLessThanOrEqual(after + ninetyDaysMs);
    });

    it("creates the first pending task", async () => {
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Check furnace", description: null, intervalDays: 180 },
      });

      // Verify via the component endpoint
      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduleTasks = component.tasks.filter(t => t.scheduleId === schedule.id);

      expect(scheduleTasks).toHaveLength(1);
      expect(scheduleTasks[0].title).toBe("Check furnace");
      expect(scheduleTasks[0].status).toBe("pending");
    });

    it("returns 404 for non-existent component", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components/not-real/schedules", {
        method: "POST",
        body: { name: "Test", description: null, intervalDays: 30 },
      });

      expect(status).toBe(404);
    });

    it("returns 422 for missing name", async () => {
      const { status } = await authenticatedFetchWithStatus(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { description: null, intervalDays: 30 },
      });

      expect(status).toBe(422);
    });

    it("returns 422 for invalid intervalDays", async () => {
      const { status } = await authenticatedFetchWithStatus(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Test", description: null, intervalDays: 0 },
      });

      expect(status).toBe(422);
    });

    it("returns 401 without authentication", async () => {
      const { status } = await unauthenticatedFetchWithStatus(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Test", description: null, intervalDays: 30 },
      });

      expect(status).toBe(401);
    });

    it("creates a schedule with custom firstDueDate", async () => {
      const fourteenDaysFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Replace filter", description: null, intervalDays: 30, firstDueDate: fourteenDaysFromNow },
      });

      expect(schedule.nextDueAt).toBe(fourteenDaysFromNow);
    });

    it("first pending task uses firstDueDate when provided", async () => {
      const fourteenDaysFromNow = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Check furnace", description: null, intervalDays: 30, firstDueDate: fourteenDaysFromNow },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const scheduleTasks = component.tasks.filter(t => t.scheduleId === schedule.id);

      expect(scheduleTasks).toHaveLength(1);
      expect(scheduleTasks[0].dueAt).toBe(fourteenDaysFromNow);
    });

    it("returns 422 when firstDueDate exceeds intervalDays from now", async () => {
      const thirtyFiveDaysFromNow = Date.now() + 35 * 24 * 60 * 60 * 1000;
      const { status } = await authenticatedFetchWithStatus(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Test", description: null, intervalDays: 30, firstDueDate: thirtyFiveDaysFromNow },
      });

      expect(status).toBe(422);
    });
  });

  describe("GET /api/schedules/[id]", () => {
    it("returns schedule with component relation", async () => {
      const created = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Test Schedule", description: null, intervalDays: 30 },
      });

      const schedule = await authenticatedFetch<ApiScheduleDetail>(`/api/schedules/${created.id}`);

      expect(schedule.name).toBe("Test Schedule");
      expect(schedule.houseComponent).toBeDefined();
      expect(schedule.houseComponent.slug).toBe(componentSlug);
    });

    it("returns 404 for non-existent schedule", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/schedules/99999");
      expect(status).toBe(404);
    });

    it("returns 400 for invalid schedule ID", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/schedules/not-a-number");
      expect(status).toBe(400);
    });

    it("returns 404 for another user's schedule", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherSchedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${otherComponent.slug}/schedules`, {
        method: "POST",
        body: { name: "Their Schedule", description: null, intervalDays: 30 },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/schedules/${otherSchedule.id}`);
      expect(status).toBe(404);
    });
  });

  describe("PUT /api/schedules/[id]", () => {
    it("updates schedule name and description", async () => {
      const created = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Old Name", description: "Old description", intervalDays: 30 },
      });

      const updated = await authenticatedFetch<ApiSchedule>(`/api/schedules/${created.id}`, {
        method: "PUT",
        body: { name: "New Name", description: "New description" },
      });

      expect(updated.name).toBe("New Name");
      expect(updated.description).toBe("New description");
      expect(updated.intervalDays).toBe(30); // Unchanged
    });

    it("recalculates nextDueAt when interval changes", async () => {
      const created = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Test", description: null, intervalDays: 30 },
      });

      const updated = await authenticatedFetch<ApiSchedule>(`/api/schedules/${created.id}`, {
        method: "PUT",
        body: { intervalDays: 60 },
      });

      const sixtyDaysMs = 60 * 24 * 60 * 60 * 1000;
      const expectedNextDue = Date.now() + sixtyDaysMs;
      expect(updated.nextDueAt).toBeGreaterThanOrEqual(expectedNextDue - 2000);
      expect(updated.nextDueAt).toBeLessThanOrEqual(expectedNextDue + 2000);
    });

    it("returns 404 for non-existent schedule", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/schedules/99999", {
        method: "PUT",
        body: { name: "New" },
      });

      expect(status).toBe(404);
    });

    it("cannot update another user's schedule", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherSchedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${otherComponent.slug}/schedules`, {
        method: "POST",
        body: { name: "Their Schedule", description: null, intervalDays: 30 },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/schedules/${otherSchedule.id}`, {
        method: "PUT",
        body: { name: "Stolen" },
      });

      expect(status).toBe(404);
    });
  });

  describe("DELETE /api/schedules/[id]", () => {
    it("deletes schedule and returns success", async () => {
      const created = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Doomed", description: null, intervalDays: 30 },
      });

      const result = await authenticatedFetch<ApiDeleteResponse>(`/api/schedules/${created.id}`, {
        method: "DELETE",
      });

      expect(result.success).toBe(true);

      // Verify it's gone
      const { status } = await authenticatedFetchWithStatus(`/api/schedules/${created.id}`);
      expect(status).toBe(404);
    });

    it("orphans tasks when schedule is deleted", async () => {
      const schedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${componentSlug}/schedules`, {
        method: "POST",
        body: { name: "Doomed Schedule", description: null, intervalDays: 30 },
      });

      // Get the auto-created task
      const componentBefore = await authenticatedFetch<ApiHouseComponentDetail>(`/api/house-components/${componentSlug}`);
      const task = componentBefore.tasks.find(t => t.scheduleId === schedule.id);

      // Delete schedule
      await authenticatedFetch<ApiDeleteResponse>(`/api/schedules/${schedule.id}`, {
        method: "DELETE",
      });

      // Task should still exist but with null scheduleId
      const taskAfter = await authenticatedFetch<ApiTaskDetail>(`/api/tasks/${task!.id}`);
      expect(taskAfter).toBeDefined();
      expect(taskAfter.scheduleId).toBeNull();
    });

    it("returns 404 for non-existent schedule", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/schedules/99999", {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });

    it("cannot delete another user's schedule", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });
      const otherSchedule = await authenticatedFetch<ApiSchedule>(`/api/house-components/${otherComponent.slug}/schedules`, {
        method: "POST",
        body: { name: "Their Schedule", description: null, intervalDays: 30 },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus(`/api/schedules/${otherSchedule.id}`, {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });
  });
});
