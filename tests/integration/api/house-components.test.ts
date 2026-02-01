import { setup } from "@nuxt/test-utils/e2e";
import { beforeEach, describe, expect, it } from "vitest";

import type { ApiDeleteResponse, ApiHouseComponent, ApiHouseComponentDetail } from "../helpers";

import {
  authenticatedFetch,
  authenticatedFetchWithStatus,
  loadTestEnv,
  resetDatabase,
  seedTestUser,
  setupTestDatabase,
  unauthenticatedFetchWithStatus,
} from "../helpers";

describe("House Components API", async () => {
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

  describe("GET /api/house-components", () => {
    it("returns empty array when no components", async () => {
      const components = await authenticatedFetch<ApiHouseComponent[]>("/api/house-components");
      expect(components).toEqual([]);
    });

    it("returns user's components sorted by name", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Zebra", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Alpha", description: null },
      });

      const components = await authenticatedFetch<ApiHouseComponent[]>("/api/house-components");

      expect(components).toHaveLength(2);
      expect(components[0].name).toBe("Alpha");
      expect(components[1].name).toBe("Zebra");
    });

    it("does not return other users' components", async () => {
      await seedTestUser("other-user");
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "My Component", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Other Component", description: null },
        userId: "other-user",
      });

      const components = await authenticatedFetch<ApiHouseComponent[]>("/api/house-components");

      expect(components).toHaveLength(1);
      expect(components[0].name).toBe("My Component");
    });

    it("returns 401 without authentication", async () => {
      const { status } = await unauthenticatedFetchWithStatus("/api/house-components");
      expect(status).toBe(401);
    });
  });

  describe("POST /api/house-components", () => {
    it("creates a component with auto-generated slug", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Kitchen Sink", description: "Under the window" },
      });

      expect(component.name).toBe("Kitchen Sink");
      expect(component.slug).toBe("kitchen-sink");
      expect(component.description).toBe("Under the window");
    });

    it("creates a component without description", async () => {
      const component = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });

      expect(component.name).toBe("Furnace");
      expect(component.description).toBeNull();
    });

    it("creates a component with parent", async () => {
      const parent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage", description: null },
      });
      const child = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage Door", description: null, parentId: parent.id },
      });

      expect(child.parentId).toBe(parent.id);
    });

    it("returns 409 for duplicate name", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });

      const { status } = await authenticatedFetchWithStatus("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });

      expect(status).toBe(409);
    });

    it("returns 422 for missing name", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components", {
        method: "POST",
        body: { description: "No name" },
      });

      expect(status).toBe(422);
    });

    it("returns 422 for empty name", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components", {
        method: "POST",
        body: { name: "", description: null },
      });

      expect(status).toBe(422);
    });

    it("returns 401 without authentication", async () => {
      const { status } = await unauthenticatedFetchWithStatus("/api/house-components", {
        method: "POST",
        body: { name: "Test", description: null },
      });

      expect(status).toBe(401);
    });
  });

  describe("GET /api/house-components/[slug]", () => {
    it("returns component with relations", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: "In the basement" },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>("/api/house-components/furnace");

      expect(component.name).toBe("Furnace");
      expect(component.description).toBe("In the basement");
      expect(component.tasks).toEqual([]);
      expect(component.schedules).toEqual([]);
      expect(component.ancestors).toEqual([]);
    });

    it("returns ancestors for nested component", async () => {
      const parent = await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Garage Door", description: null, parentId: parent.id },
      });

      const component = await authenticatedFetch<ApiHouseComponentDetail>("/api/house-components/garage-door");

      expect(component.ancestors).toHaveLength(1);
      expect(component.ancestors[0].name).toBe("Garage");
    });

    it("returns 404 for non-existent slug", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components/not-real");
      expect(status).toBe(404);
    });

    it("returns 404 for another user's component", async () => {
      await seedTestUser("other-user");
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Their Component", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus("/api/house-components/their-component");
      expect(status).toBe(404);
    });
  });

  describe("PUT /api/house-components/[slug]", () => {
    it("updates component name and regenerates slug", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Old Name", description: null },
      });

      const updated = await authenticatedFetch<ApiHouseComponent>("/api/house-components/old-name", {
        method: "PUT",
        body: { name: "New Name" },
      });

      expect(updated.name).toBe("New Name");
      expect(updated.slug).toBe("new-name");
    });

    it("updates description without changing slug", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });

      const updated = await authenticatedFetch<ApiHouseComponent>("/api/house-components/furnace", {
        method: "PUT",
        body: { description: "New description" },
      });

      expect(updated.description).toBe("New description");
      expect(updated.slug).toBe("furnace");
    });

    it("returns 404 for non-existent component", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components/not-real", {
        method: "PUT",
        body: { name: "Whatever" },
      });

      expect(status).toBe(404);
    });

    it("returns 409 when renaming to existing name", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Furnace", description: null },
      });
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Water Heater", description: null },
      });

      const { status } = await authenticatedFetchWithStatus("/api/house-components/water-heater", {
        method: "PUT",
        body: { name: "Furnace" },
      });

      expect(status).toBe(409);
    });

    it("cannot update another user's component", async () => {
      await seedTestUser("other-user");
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Their Component", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus("/api/house-components/their-component", {
        method: "PUT",
        body: { name: "Stolen" },
      });

      expect(status).toBe(404);
    });
  });

  describe("DELETE /api/house-components/[slug]", () => {
    it("deletes component and returns success", async () => {
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Doomed", description: null },
      });

      const result = await authenticatedFetch<ApiDeleteResponse>("/api/house-components/doomed", {
        method: "DELETE",
      });

      expect(result.success).toBe(true);

      // Verify it's gone
      const { status } = await authenticatedFetchWithStatus("/api/house-components/doomed");
      expect(status).toBe(404);
    });

    it("returns 404 for non-existent component", async () => {
      const { status } = await authenticatedFetchWithStatus("/api/house-components/not-real", {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });

    it("cannot delete another user's component", async () => {
      await seedTestUser("other-user");
      await authenticatedFetch<ApiHouseComponent>("/api/house-components", {
        method: "POST",
        body: { name: "Their Component", description: null },
        userId: "other-user",
      });

      const { status } = await authenticatedFetchWithStatus("/api/house-components/their-component", {
        method: "DELETE",
      });

      expect(status).toBe(404);
    });
  });
});
