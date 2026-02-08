import { z } from "zod";

export const NameSchema = z.string().min(1, "Name is required").max(100);
export const DescriptionSchema = z.string().max(1000).nullable();
export const SlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");
export const DateSchema = z.number({ message: "Date is required" });
export const RoomSchema = z.string().max(100).nullable();
export const FloorSchema = z.number().int().min(0, "Floor must be 0, 1, or 2").max(2, "Floor must be 0, 1, or 2").nullable();
