import type { z } from "zod";

import { relations } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z as zod } from "zod";

import { DescriptionSchema, NameSchema } from "../zod-schemas";
import { houseComponent } from "./house-component";
import { task } from "./task";

export const maintenanceSchedule = sqliteTable("maintenanceSchedule", {
  id: int().primaryKey({ autoIncrement: true }),
  houseComponentId: int().notNull().references(() => houseComponent.id, { onDelete: "cascade" }),
  name: text().notNull(),
  description: text(),
  intervalDays: int().notNull(),
  lastCompletedAt: int(),
  nextDueAt: int().notNull(),
  createdAt: int().notNull().$default(() => Date.now()),
});

export const maintenanceScheduleRelations = relations(maintenanceSchedule, ({ one, many }) => ({
  houseComponent: one(houseComponent, {
    fields: [maintenanceSchedule.houseComponentId],
    references: [houseComponent.id],
  }),
  tasks: many(task),
}));

const BaseInsertMaintenanceSchedule = createInsertSchema(maintenanceSchedule, {
  name: NameSchema,
  description: DescriptionSchema,
  intervalDays: zod.number().int().min(1, "Interval must be at least 1 day").max(365 * 5, "Interval cannot exceed 5 years"),
}).omit({
  id: true,
  houseComponentId: true,
  lastCompletedAt: true,
  nextDueAt: true,
  createdAt: true,
});

export const InsertMaintenanceSchedule = BaseInsertMaintenanceSchedule.extend({
  firstDueDate: zod.number().nullable().optional(),
}).refine(
  (data) => {
    if (data.firstDueDate == null)
      return true;
    const maxAllowed = Date.now() + (data.intervalDays * 24 * 60 * 60 * 1000);
    return data.firstDueDate <= maxAllowed;
  },
  {
    message: "First due date cannot be further out than the interval allows",
    path: ["firstDueDate"],
  },
);

export const UpdateMaintenanceSchedule = BaseInsertMaintenanceSchedule.partial();

export type InsertMaintenanceSchedule = z.infer<typeof InsertMaintenanceSchedule>;
export type UpdateMaintenanceSchedule = z.infer<typeof UpdateMaintenanceSchedule>;
export type SelectMaintenanceSchedule = typeof maintenanceSchedule.$inferSelect;
