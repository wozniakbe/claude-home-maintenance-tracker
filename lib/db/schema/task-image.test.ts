import { describe, expect, it } from "vitest";

import { InsertTaskImage } from "./task-image";

describe("task-image schemas", () => {
  describe("InsertTaskImage", () => {
    it("accepts valid image data", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: "Before photo",
      });

      expect(result.success).toBe(true);
    });

    it("accepts image with null caption", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: null,
      });

      expect(result.success).toBe(true);
    });

    it("requires key", () => {
      const result = InsertTaskImage.safeParse({
        caption: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid key format - missing user folder", () => {
      const result = InsertTaskImage.safeParse({
        key: "456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: null,
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe("Invalid storage key format");
      }
    });

    it("rejects invalid key format - missing task folder", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid key format - wrong extension", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.png",
        caption: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid key format - missing uuid", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/.jpg",
        caption: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects invalid key format - spaces in path", () => {
      const result = InsertTaskImage.safeParse({
        key: "user 123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: null,
      });

      expect(result.success).toBe(false);
    });

    it("rejects caption over 500 characters", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: "x".repeat(501),
      });

      expect(result.success).toBe(false);
    });

    it("accepts caption at exactly 500 characters", () => {
      const result = InsertTaskImage.safeParse({
        key: "user123/456/a1b2c3d4-e5f6-7890-abcd-ef1234567890.jpg",
        caption: "x".repeat(500),
      });

      expect(result.success).toBe(true);
    });
  });
});
