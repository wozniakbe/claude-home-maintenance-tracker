import { z } from "zod";

export const NameSchema = z.string().min(1, "Name is required").max(100);
export const DescriptionSchema = z.string().max(1000).nullable();
export const SlugSchema = z.string().min(1).max(100).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens");
export const DateSchema = z.number({ message: "Date is required" });
