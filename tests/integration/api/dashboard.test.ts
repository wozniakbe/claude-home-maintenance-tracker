import { setup } from "@nuxt/test-utils/e2e";
import { beforeEach, describe, expect, it } from "vitest";

import type { ApiDashboard, ApiHouseComponent, ApiTask } from "../helpers";

import {
  authenticatedFetch,
  loadTestEnv,
  resetDatabase,
  seedTestUser,
  setupTestDatabase,
  unauthenticatedFetchWithStatus,
} from "../helpers";

describe("Dashboard API", async () => {
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

  beforeEach(async () => {
    await resetDatabase();
    await seedTestUser("test-user-1");
  });

  describe("GET /api/dashboard", () => {
    it("returns empty state for new user", async () => {
      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.stats.componentCount).toBe(0);
      expect(dashboard.stats.pendingTaskCount).toBe(0);
      expect(dashboard.stats.overdueTaskCount).toBe(0);
      expect(dashboard.overdueTasks).toEqual([]);
      expect(dashboard.upcomingTasks).toEqual([]);
      expect(dashboard.recentlyCompletedTasks).toEqual([]);
      expect(dashboard.houseComponents).toEqual([]);
      expect(dashboard.componentsTree).toEqual([]);
    });

    it("returns correct component count", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Water Heater", description: null },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.stats.componentCount).toBe(2);
      expect(dashboard.houseComponents).toHaveLength(2);
    });

    it("returns pending task count", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      await authenticatedFetch<ApiTask>(`/api/house-components/${component.slug}/tasks`, {
        method: "POST",
        body: { title: "Task 1", description: null },
      });
      await authenticatedFetch<ApiTask>(`/api/house-components/${component.slug}/tasks`, {
        method: "POST",
        body: { title: "Task 2", description: null },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.stats.pendingTaskCount).toBe(2);
    });

    it("returns overdue tasks", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      const pastDue = Date.now() - 86400000;
      await authenticatedFetch<ApiTask>(`/api/house-components/${component.slug}/tasks`, {
        method: "POST",
        body: { title: "Overdue Task", description: null, dueAt: pastDue },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.stats.overdueTaskCount).toBe(1);
      expect(dashboard.overdueTasks).toHaveLength(1);
      expect(dashboard.overdueTasks[0].title).toBe("Overdue Task");
    });

    it("returns upcoming tasks", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      const tomorrow = Date.now() + 86400000;
      await authenticatedFetch<ApiTask>(`/api/house-components/${component.slug}/tasks`, {
        method: "POST",
        body: { title: "Tomorrow Task", description: null, dueAt: tomorrow },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.upcomingTasks).toHaveLength(1);
      expect(dashboard.upcomingTasks[0].title).toBe("Tomorrow Task");
    });

    it("returns recently completed tasks", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      const task = await authenticatedFetch<ApiTask>(`/api/house-components/${component.slug}/tasks`, {
        method: "POST",
        body: { title: "Done Task", description: null },
      });
      await authenticatedFetch<ApiTask>(`/api/tasks/${task.id}/complete`, {
        method: "POST",
        body: { status: "completed" },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.recentlyCompletedTasks).toHaveLength(1);
      expect(dashboard.recentlyCompletedTasks[0].title).toBe("Done Task");
    });

    it("returns components tree", async () => {
      const garage = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage Door", description: null, parentId: garage.id },
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.componentsTree).toHaveLength(1);
      expect(dashboard.componentsTree[0].name).toBe("Garage");
      expect(dashboard.componentsTree[0].children).toHaveLength(1);
      expect(dashboard.componentsTree[0].children[0].name).toBe("Garage Door");
    });

    it("excludes other users' data", async () => {
      await seedTestUser("other-user");
      const otherComponent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Furnace", description: null },
        userId: "other-user",
      });
      await authenticatedFetch<ApiTask>(`/api/house-components/${otherComponent.slug}/tasks`, {
        method: "POST",
        body: { title: "Other Task", description: null },
        userId: "other-user",
      });

      const dashboard = await authenticatedFetch<ApiDashboard>("/api/dashboard");

      expect(dashboard.stats.componentCount).toBe(0);
      expect(dashboard.stats.pendingTaskCount).toBe(0);
    });

    it("returns 401 without authentication", async () => {
      const { status } = await unauthenticatedFetchWithStatus("/api/dashboard");
      expect(status).toBe(401);
    });
  });
});
