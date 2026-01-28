import { describe, expect, it } from "vitest";

import { InsertMaintenanceSchedule, UpdateMaintenanceSchedule } from "./maintenance-schedule";

describe("maintenance-schedule schemas", () => {
  describe("InsertMaintenanceSchedule", () => {
    it("accepts valid schedule data", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Replace filter",
        description: "Use MERV 13",
        intervalDays: 90,
      });

      expect(result.success).toBe(true);
    });

    it("accepts schedule with null description", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Check furnace",
        description: null,
        intervalDays: 180,
      });

      expect(result.success).toBe(true);
    });

    it("requires name", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        description: null,
        intervalDays: 30,
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty name", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "",
        description: null,
        intervalDays: 30,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Name is required");
      }
    });

    it("rejects name over 100 characters", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "x".repeat(101),
        description: null,
        intervalDays: 30,
      });

      expect(result.success).toBe(false);
    });

    it("requires intervalDays", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Valid Name",
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects intervalDays less than 1", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Valid Name",
        description: null,
        intervalDays: 0,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Interval must be at least 1 day");
      }
    });

    it("accepts intervalDays of 1", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Daily check",
        description: null,
        intervalDays: 1,
      });

      expect(result.success).toBe(true);
    });

    it("rejects intervalDays over 5 years (1825 days)", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Valid Name",
        description: null,
        intervalDays: 365 * 5 + 1,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Interval cannot exceed 5 years");
      }
    });

    it("accepts intervalDays at exactly 5 years", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "5 year inspection",
        description: null,
        intervalDays: 365 * 5,
      });

      expect(result.success).toBe(true);
    });

    it("rejects non-integer intervalDays", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Valid Name",
        description: null,
        intervalDays: 30.5,
      });

      expect(result.success).toBe(false);
    });

    it("rejects description over 1000 characters", () => {
      const result = InsertMaintenanceSchedule.safeParse({
        name: "Valid Name",
        description: "x".repeat(1001),
        intervalDays: 30,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("UpdateMaintenanceSchedule", () => {
    it("accepts partial update with only name", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        name: "New Name",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only description", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        description: "New description",
      });

      expect(result.success).toBe(true);
    });

    it("accepts partial update with only intervalDays", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        intervalDays: 60,
      });

      expect(result.success).toBe(true);
    });

    it("accepts empty object (no updates)", () => {
      const result = UpdateMaintenanceSchedule.safeParse({});

      expect(result.success).toBe(true);
    });

    it("accepts full update", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        name: "Updated Name",
        description: "Updated description",
        intervalDays: 45,
      });

      expect(result.success).toBe(true);
    });

    it("rejects invalid name when provided", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        name: "",
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid intervalDays when provided", () => {
      const result = UpdateMaintenanceSchedule.safeParse({
        intervalDays: 0,
      });

      expect(result.success).toBe(false);
    });
  });
});
