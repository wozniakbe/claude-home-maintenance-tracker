import type { z } from "zod";

import { relations } from "drizzle-orm";
import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z as zod } from "zod";

import { task } from "./task";

export const taskImage = sqliteTable("taskImage", {
  id: int().primaryKey({ autoIncrement: true }),
  taskId: int().notNull().references(() => task.id, { onDelete: "cascade" }),
  key: text().notNull(),
  caption: text(),
  createdAt: int().notNull().$default(() => Date.now()),
});

export const taskImageRelations = relations(taskImage, ({ one }) => ({
  task: one(task, {
    fields: [taskImage.taskId],
    references: [task.id],
  }),
}));

export const InsertTaskImage = createInsertSchema(taskImage, {
  key: zod.string().regex(
    /^[a-zA-Z0-9]+\/\d+\/[a-f0-9-]+\.[a-z]+$/,
    "Invalid storage key format",
  ),
  caption: zod.string().max(500).nullable(),
}).omit({
  id: true,
  taskId: true,
  createdAt: true,
});

export type InsertTaskImage = z.infer<typeof InsertTaskImage>;
export type SelectTaskImage = typeof taskImage.$inferSelect;
