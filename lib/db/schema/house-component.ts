import type { AnySQLiteColumn } from "drizzle-orm/sqlite-core";
import type { z } from "zod";

import { relations } from "drizzle-orm";
import { int, sqliteTable, text, unique } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";

import { DescriptionSchema, FloorSchema, NameSchema, RoomSchema } from "../zod-schemas";
import { user } from "./auth";
import { maintenanceSchedule } from "./maintenance-schedule";
import { task } from "./task";

export const houseComponent = sqliteTable("houseComponent", {
  id: int().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  slug: text().notNull(),
  description: text(),
  room: text(),
  floor: int(),
  parentId: int().references((): AnySQLiteColumn => houseComponent.id, { onDelete: "cascade" }),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  createdAt: int().notNull().$default(() => Date.now()),
  updatedAt: int().notNull().$default(() => Date.now()).$onUpdate(() => Date.now()),
}, t => [
  unique().on(t.slug, t.userId),
]);

export const houseComponentRelations = relations(houseComponent, ({ one, many }) => ({
  parent: one(houseComponent, {
    fields: [houseComponent.parentId],
    references: [houseComponent.id],
    relationName: "children",
  }),
  children: many(houseComponent, {
    relationName: "children",
  }),
  schedules: many(maintenanceSchedule),
  tasks: many(task),
}));

export const InsertHouseComponent = createInsertSchema(houseComponent, {
  name: NameSchema,
  description: DescriptionSchema,
  room: RoomSchema.optional(),
  floor: FloorSchema.optional(),
  parentId: schema => schema.nullable(),
}).omit({
  id: true,
  slug: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export const UpdateHouseComponent = createInsertSchema(houseComponent, {
  name: NameSchema,
  description: DescriptionSchema,
  room: RoomSchema,
  floor: FloorSchema,
  parentId: schema => schema.nullable(),
}).omit({
  id: true,
  slug: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
}).partial();

export type InsertHouseComponent = z.infer<typeof InsertHouseComponent>;
export type UpdateHouseComponent = z.infer<typeof UpdateHouseComponent>;
export type SelectHouseComponent = typeof houseComponent.$inferSelect;
