import { describe, expect, it } from "vitest";

import { InsertHouseComponent, UpdateHouseComponent } from "./house-component";

describe("house-component schemas", () => {
  describe("InsertHouseComponent", () => {
    it("accepts valid component data", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Kitchen Sink",
        description: "Under the window",
      });

      expect(result.success).toBe(true);
    });

    it("accepts component with null description", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
      });

      expect(result.success).toBe(true);
    });

    it("accepts component with parentId", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Garage Door",
        description: null,
        parentId: 1,
      });

      expect(result.success).toBe(true);
    });

    it("accepts component with null parentId", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Garage",
        description: null,
        parentId: null,
      });

      expect(result.success).toBe(true);
    });

    it("accepts component with room and floor", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        room: "Utility Room",
        floor: 0,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.room).toBe("Utility Room");
        expect(result.data.floor).toBe(0);
      }
    });

    it("accepts null room and floor", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        room: null,
        floor: null,
      });

      expect(result.success).toBe(true);
    });

    it("rejects floor outside 0-2 range", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        floor: 3,
      });

      expect(result.success).toBe(false);
    });

    it("rejects negative floor", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        floor: -1,
      });

      expect(result.success).toBe(false);
    });

    it("rejects non-integer floor", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        floor: 1.5,
      });

      expect(result.success).toBe(false);
    });

    it("accepts all valid floor values (0, 1, 2)", () => {
      for (const floor of [0, 1, 2]) {
        const result = InsertHouseComponent.safeParse({
          name: "Test",
          description: null,
          floor,
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects room over 100 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        room: "x".repeat(101),
      });

      expect(result.success).toBe(false);
    });

    it("accepts room at exactly 100 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Furnace",
        description: null,
        room: "x".repeat(100),
      });

      expect(result.success).toBe(true);
    });

    it("requires name", () => {
      const result = InsertHouseComponent.safeParse({
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = InsertHouseComponent.safeParse({
        name: "",
        description: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name is required");
      }
    });

    it("rejects name over 100 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "x".repeat(101),
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("accepts name at exactly 100 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "x".repeat(100),
        description: null,
      });

      expect(result.success).toBe(true);
    });

    it("rejects description over 1000 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Valid Name",
        description: "x".repeat(1001),
      });

      expect(result.success).toBe(false);
    });

    it("accepts description at exactly 1000 characters", () => {
      const result = InsertHouseComponent.safeParse({
        name: "Valid Name",
        description: "x".repeat(1000),
      });

      expect(result.success).toBe(true);
    });
  });

  describe("UpdateHouseComponent", () => {
    it("accepts partial update with only name", () => {
      const result = UpdateHouseComponent.safeParse({
        name: "New Name",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only description", () => {
      const result = UpdateHouseComponent.safeParse({
        description: "New description",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only parentId", () => {
      const result = UpdateHouseComponent.safeParse({
        parentId: 5,
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty object (no updates)", () => {
      const result = UpdateHouseComponent.safeParse({});

      expect(result.success).toBe(true);
    });

    it("accepts full update", () => {
      const result = UpdateHouseComponent.safeParse({
        name: "Updated Name",
        description: "Updated description",
        parentId: 2,
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid name when provided", () => {
      const result = UpdateHouseComponent.safeParse({
        name: "",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid description when provided", () => {
      const result = UpdateHouseComponent.safeParse({
        description: "x".repeat(1001),
      });

      expect(result.success).toBe(false);
    });

    it("accepts partial update with only room", () => {
      const result = UpdateHouseComponent.safeParse({
        room: "Kitchen",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only floor", () => {
      const result = UpdateHouseComponent.safeParse({
        floor: 1,
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid floor when provided", () => {
      const result = UpdateHouseComponent.safeParse({
        floor: 5,
      });

      expect(result.success).toBe(false);
    });
  });
});
