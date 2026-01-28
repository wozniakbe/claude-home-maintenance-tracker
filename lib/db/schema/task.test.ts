import { describe, expect, it } from "vitest";

import { CompleteTask, InsertTask } from "./task";

describe("task schemas", () => {
  describe("insertTask", () => {
    it("accepts valid task data", () => {
      const result = InsertTask.safeParse({
        title: "Replace filter",
        description: "Use MERV 13",
        dueAt: Date.now() + 86400000,
      });

      expect(result.success).toBe(true);
    });

    it("accepts task with null description", () => {
      const result = InsertTask.safeParse({
        title: "Simple task",
        description: null,
      });

      expect(result.success).toBe(true);
    });

    it("requires title", () => {
      const result = InsertTask.safeParse({
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects empty title", () => {
      const result = InsertTask.safeParse({
        title: "",
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects title over 100 characters", () => {
      const result = InsertTask.safeParse({
        title: "x".repeat(101),
        description: null,
      });

      expect(result.success).toBe(false);
    });

    it("accepts title at exactly 100 characters", () => {
      const result = InsertTask.safeParse({
        title: "x".repeat(100),
        description: null,
      });

      expect(result.success).toBe(true);
    });
  });

  describe("completeTask", () => {
    it("accepts completed status", () => {
      const result = CompleteTask.safeParse({ status: "completed" });
      expect(result.success).toBe(true);
    });

    it("accepts skipped status", () => {
      const result = CompleteTask.safeParse({ status: "skipped" });
      expect(result.success).toBe(true);
    });

    it("rejects pending status", () => {
      const result = CompleteTask.safeParse({ status: "pending" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = CompleteTask.safeParse({ status: "done" });
      expect(result.success).toBe(false);
    });

    it("accepts optional completedAt timestamp", () => {
      const result = CompleteTask.safeParse({
        status: "completed",
        completedAt: Date.now(),
      });
      expect(result.success).toBe(true);
    });
  });
});
