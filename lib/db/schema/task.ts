import type { z } from "zod";

import { relations } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z as zod } from "zod";

import { DescriptionSchema, NameSchema } from "../zod-schemas";
import { houseComponent } from "./house-component";
import { maintenanceSchedule } from "./maintenance-schedule";
import { taskImage } from "./task-image";

export const taskStatusEnum = ["pending", "completed", "skipped"] as const;
export type TaskStatus = typeof taskStatusEnum[number];

export const task = sqliteTable("task", {
  id: int().primaryKey({ autoIncrement: true }),
  houseComponentId: int().notNull().references(() => houseComponent.id, { onDelete: "cascade" }),
  scheduleId: int().references(() => maintenanceSchedule.id, { onDelete: "set null" }),
  title: text().notNull(),
  description: text(),
  status: text().notNull().default("pending").$type<TaskStatus>(),
  dueAt: int(),
  completedAt: int(),
  createdAt: int().notNull().$default(() => Date.now()),
});

export const taskRelations = relations(task, ({ one, many }) => ({
  houseComponent: one(houseComponent, {
    fields: [task.houseComponentId],
    references: [houseComponent.id],
  }),
  schedule: one(maintenanceSchedule, {
    fields: [task.scheduleId],
    references: [maintenanceSchedule.id],
  }),
  images: many(taskImage),
}));

export const InsertTask = createInsertSchema(task, {
  title: NameSchema,
  description: DescriptionSchema,
  status: zod.enum(taskStatusEnum).default("pending"),
  dueAt: zod.number().nullable().optional(),
}).omit({
  id: true,
  houseComponentId: true,
  scheduleId: true,
  completedAt: true,
  createdAt: true,
});

export const UpdateTask = InsertTask.partial();

export const CompleteTask = zod.object({
  status: zod.enum(["completed", "skipped"]),
  completedAt: zod.number().optional(),
});

export type InsertTask = z.infer<typeof InsertTask>;
export type UpdateTask = z.infer<typeof UpdateTask>;
export type CompleteTask = z.infer<typeof CompleteTask>;
export type SelectTask = typeof task.$inferSelect;
export type SelectTaskWithImages = SelectTask & {
  images: (typeof taskImage.$inferSelect)[];
};
