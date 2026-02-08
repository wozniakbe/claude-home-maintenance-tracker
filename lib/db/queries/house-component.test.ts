import { beforeEach, describe, expect, it, vi } from "vitest";

import type { TestDb } from "../test-utils";

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
  createHouseComponent,
  deleteHouseComponent,
  getAncestors,
  getComponentsTree,
  getHouseComponentByName,
  getHouseComponentBySlug,
  getHouseComponentsByUserId,
  updateHouseComponent,
} = await import("./house-component");

describe("house-component queries", () => {
  let userId: string;

  beforeEach(async () => {
    // Create fresh database for each test
    dbRef.current = createTestDb();
    await setupTestSchema(dbRef.current);
    userId = await seedTestUser(dbRef.current);
  });

  describe("createHouseComponent", () => {
    it("creates a component with auto-generated slug", async () => {
      const component = await createHouseComponent(userId, {
        name: "Kitchen Sink",
        description: "Under the window",
      });

      expect(component).toBeDefined();
      expect(component.name).toBe("Kitchen Sink");
      expect(component.slug).toBe("kitchen-sink");
      expect(component.description).toBe("Under the window");
      expect(component.userId).toBe(userId);
    });

    it("creates a component without description", async () => {
      const component = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
      });

      expect(component.name).toBe("Furnace");
      expect(component.description).toBeNull();
    });

    it("generates unique slug when name conflicts", async () => {
      const first = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
      });
      const second = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
      });

      expect(first.slug).toBe("furnace");
      expect(second.slug).toMatch(/^furnace-[a-z0-9]+$/);
    });

    it("creates component with parent", async () => {
      const parent = await createHouseComponent(userId, {
        name: "Garage",
        description: null,
      });
      const child = await createHouseComponent(userId, {
        name: "Garage Door",
        description: null,
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });

    it("creates component with room and floor", async () => {
      const component = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
        room: "Utility Room",
        floor: 0,
      });

      expect(component.room).toBe("Utility Room");
      expect(component.floor).toBe(0);
    });

    it("nulls room and floor for sub-components", async () => {
      const parent = await createHouseComponent(userId, {
        name: "Garage",
        description: null,
        room: "Garage",
        floor: 1,
      });
      const child = await createHouseComponent(userId, {
        name: "Garage Door",
        description: null,
        parentId: parent.id,
        room: "Should be nulled",
        floor: 2,
      });

      expect(child.room).toBeNull();
      expect(child.floor).toBeNull();
    });
  });

  describe("getHouseComponentsByUserId", () => {
    it("returns empty array for user with no components", async () => {
      const components = await getHouseComponentsByUserId(userId);
      expect(components).toEqual([]);
    });

    it("returns components sorted by name", async () => {
      await createHouseComponent(userId, { name: "Zebra", description: null });
      await createHouseComponent(userId, { name: "Alpha", description: null });
      await createHouseComponent(userId, { name: "Middle", description: null });

      const components = await getHouseComponentsByUserId(userId);

      expect(components).toHaveLength(3);
      expect(components[0].name).toBe("Alpha");
      expect(components[1].name).toBe("Middle");
      expect(components[2].name).toBe("Zebra");
    });

    it("only returns components for the specified user", async () => {
      const otherUserId = await seedTestUser(dbRef.current!, "other-user");
      await createHouseComponent(userId, { name: "My Component", description: null });
      await createHouseComponent(otherUserId, { name: "Their Component", description: null });

      const myComponents = await getHouseComponentsByUserId(userId);
      const theirComponents = await getHouseComponentsByUserId(otherUserId);

      expect(myComponents).toHaveLength(1);
      expect(myComponents[0].name).toBe("My Component");
      expect(theirComponents).toHaveLength(1);
      expect(theirComponents[0].name).toBe("Their Component");
    });
  });

  describe("getHouseComponentBySlug", () => {
    it("returns null for non-existent slug", async () => {
      const component = await getHouseComponentBySlug(userId, "not-real");
      expect(component).toBeUndefined();
    });

    it("returns component with relations", async () => {
      const created = await createHouseComponent(userId, {
        name: "Furnace",
        description: "In the basement",
      });

      const component = await getHouseComponentBySlug(userId, created.slug);

      expect(component).toBeDefined();
      expect(component!.name).toBe("Furnace");
      expect(component!.tasks).toEqual([]);
      expect(component!.schedules).toEqual([]);
      expect(component!.children).toEqual([]);
    });

    it("does not return another user's component", async () => {
      const otherUserId = await seedTestUser(dbRef.current!, "other-user");
      const created = await createHouseComponent(otherUserId, {
        name: "Their Furnace",
        description: null,
      });

      const component = await getHouseComponentBySlug(userId, created.slug);
      expect(component).toBeUndefined();
    });
  });

  describe("getHouseComponentByName", () => {
    it("finds component by exact name", async () => {
      await createHouseComponent(userId, { name: "Kitchen Sink", description: null });

      const component = await getHouseComponentByName(userId, "Kitchen Sink");
      expect(component).toBeDefined();
      expect(component!.name).toBe("Kitchen Sink");
    });

    it("returns undefined for non-existent name", async () => {
      const component = await getHouseComponentByName(userId, "Not Real");
      expect(component).toBeUndefined();
    });

    it("is case-sensitive", async () => {
      await createHouseComponent(userId, { name: "Furnace", description: null });

      const component = await getHouseComponentByName(userId, "furnace");
      expect(component).toBeUndefined();
    });
  });

  describe("updateHouseComponent", () => {
    it("updates component name and regenerates slug", async () => {
      const created = await createHouseComponent(userId, {
        name: "Old Name",
        description: null,
      });

      const updated = await updateHouseComponent(userId, created.slug, {
        name: "New Name",
      });

      expect(updated.name).toBe("New Name");
      expect(updated.slug).toBe("new-name");
    });

    it("updates description without changing slug", async () => {
      const created = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
      });

      const updated = await updateHouseComponent(userId, created.slug, {
        description: "New description",
      });

      expect(updated.description).toBe("New description");
      expect(updated.slug).toBe("furnace");
    });

    it("returns undefined when updating non-existent component", async () => {
      const updated = await updateHouseComponent(userId, "not-real", {
        name: "New Name",
      });

      expect(updated).toBeUndefined();
    });

    it("cannot update another user's component", async () => {
      const otherUserId = await seedTestUser(dbRef.current!, "other-user");
      const created = await createHouseComponent(otherUserId, {
        name: "Their Component",
        description: null,
      });

      const updated = await updateHouseComponent(userId, created.slug, {
        name: "Stolen",
      });

      expect(updated).toBeUndefined();
    });

    it("updates room and floor", async () => {
      const created = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
      });

      const updated = await updateHouseComponent(userId, created.slug, {
        room: "Basement",
        floor: 0,
      });

      expect(updated.room).toBe("Basement");
      expect(updated.floor).toBe(0);
    });

    it("nulls room and floor when setting parentId", async () => {
      const parent = await createHouseComponent(userId, {
        name: "House",
        description: null,
      });
      const created = await createHouseComponent(userId, {
        name: "Furnace",
        description: null,
        room: "Utility Room",
        floor: 0,
      });

      const updated = await updateHouseComponent(userId, created.slug, {
        parentId: parent.id,
      });

      expect(updated.parentId).toBe(parent.id);
      expect(updated.room).toBeNull();
      expect(updated.floor).toBeNull();
    });
  });

  describe("deleteHouseComponent", () => {
    it("deletes component and returns it", async () => {
      const created = await createHouseComponent(userId, {
        name: "Doomed",
        description: null,
      });

      const deleted = await deleteHouseComponent(userId, created.slug);

      expect(deleted).toBeDefined();
      expect(deleted.id).toBe(created.id);

      // Verify it's gone
      const components = await getHouseComponentsByUserId(userId);
      expect(components).toHaveLength(0);
    });

    it("returns undefined when deleting non-existent component", async () => {
      const deleted = await deleteHouseComponent(userId, "not-real");
      expect(deleted).toBeUndefined();
    });

    it("cannot delete another user's component", async () => {
      const otherUserId = await seedTestUser(dbRef.current!, "other-user");
      const created = await createHouseComponent(otherUserId, {
        name: "Their Component",
        description: null,
      });

      const deleted = await deleteHouseComponent(userId, created.slug);
      expect(deleted).toBeUndefined();

      // Verify it still exists
      const stillExists = await getHouseComponentBySlug(otherUserId, created.slug);
      expect(stillExists).toBeDefined();
    });
  });

  describe("getAncestors", () => {
    it("returns empty array for root component", async () => {
      const component = await createHouseComponent(userId, {
        name: "Root",
        description: null,
      });

      const ancestors = await getAncestors(userId, component.id);
      expect(ancestors).toEqual([]);
    });

    it("returns parent for child component", async () => {
      const parent = await createHouseComponent(userId, {
        name: "Parent",
        description: null,
      });
      const child = await createHouseComponent(userId, {
        name: "Child",
        description: null,
        parentId: parent.id,
      });

      const ancestors = await getAncestors(userId, child.id);

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].name).toBe("Parent");
      expect(ancestors[0].id).toBe(parent.id);
    });

    it("returns ancestors in order from root to parent", async () => {
      const grandparent = await createHouseComponent(userId, {
        name: "Grandparent",
        description: null,
      });
      const parent = await createHouseComponent(userId, {
        name: "Parent",
        description: null,
        parentId: grandparent.id,
      });
      const child = await createHouseComponent(userId, {
        name: "Child",
        description: null,
        parentId: parent.id,
      });

      const ancestors = await getAncestors(userId, child.id);

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].name).toBe("Grandparent");
      expect(ancestors[1].name).toBe("Parent");
    });
  });

  describe("getComponentsTree", () => {
    it("returns empty array for user with no components", async () => {
      const tree = await getComponentsTree(userId);
      expect(tree).toEqual([]);
    });

    it("returns flat list when no hierarchy", async () => {
      await createHouseComponent(userId, { name: "A", description: null });
      await createHouseComponent(userId, { name: "B", description: null });

      const tree = await getComponentsTree(userId);

      expect(tree).toHaveLength(2);
      expect(tree[0].name).toBe("A");
      expect(tree[1].name).toBe("B");
      expect(tree[0].children).toEqual([]);
      expect(tree[1].children).toEqual([]);
    });

    it("nests children under parents", async () => {
      const garage = await createHouseComponent(userId, {
        name: "Garage",
        description: null,
      });
      await createHouseComponent(userId, {
        name: "Garage Door",
        description: null,
        parentId: garage.id,
      });

      const tree = await getComponentsTree(userId);

      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("Garage");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe("Garage Door");
    });

    it("handles multiple levels of nesting", async () => {
      const house = await createHouseComponent(userId, {
        name: "House",
        description: null,
      });
      const garage = await createHouseComponent(userId, {
        name: "Garage",
        description: null,
        parentId: house.id,
      });
      await createHouseComponent(userId, {
        name: "Garage Door",
        description: null,
        parentId: garage.id,
      });

      const tree = await getComponentsTree(userId);

      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("House");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe("Garage");
      expect(tree[0].children[0].children).toHaveLength(1);
      expect(tree[0].children[0].children[0].name).toBe("Garage Door");
    });
  });
});
