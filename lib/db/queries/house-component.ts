import type { InsertHouseComponent, UpdateHouseComponent } from "~~/lib/db/schema";

import { and, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import slugify from "slug";

import db from "..";
import { houseComponent } from "../schema";

const nanoid = customAlphabet("1234567890abcdefghijklmnopqrstuvwxyz", 5);

export async function getHouseComponentsByUserId(userId: string) {
  return db.query.houseComponent.findMany({
    where: eq(houseComponent.userId, userId),
    orderBy: (fields, { asc }) => asc(fields.name),
  });
}

export async function getHouseComponentBySlug(userId: string, slug: string) {
  return db.query.houseComponent.findFirst({
    where: and(eq(houseComponent.slug, slug), eq(houseComponent.userId, userId)),
    with: {
      tasks: {
        orderBy: (fields, { desc }) => desc(fields.createdAt),
      },
      schedules: {
        orderBy: (fields, { asc }) => asc(fields.nextDueAt),
      },
      children: {
        orderBy: (fields, { asc }) => asc(fields.name),
      },
      parent: true,
    },
  });
}

export async function getHouseComponentByName(userId: string, name: string) {
  return db.query.houseComponent.findFirst({
    where: and(eq(houseComponent.name, name), eq(houseComponent.userId, userId)),
  });
}

async function getHouseComponentBySlugOnly(slug: string) {
  return db.query.houseComponent.findFirst({
    where: eq(houseComponent.slug, slug),
  });
}

async function findUniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug;
  let existing = await getHouseComponentBySlugOnly(slug);

  while (existing) {
    slug = `${baseSlug}-${nanoid()}`;
    existing = await getHouseComponentBySlugOnly(slug);
  }

  return slug;
}

export async function createHouseComponent(userId: string, data: InsertHouseComponent) {
  const baseSlug = slugify(data.name, { lower: true });
  const slug = await findUniqueSlug(baseSlug);

  const [created] = await db
    .insert(houseComponent)
    .values({ ...data, slug, userId })
    .returning();

  return created;
}

export async function updateHouseComponent(userId: string, slug: string, data: UpdateHouseComponent) {
  const updates: UpdateHouseComponent & { slug?: string } = { ...data };

  // If name changed, generate new slug
  if (data.name) {
    const baseSlug = slugify(data.name, { lower: true });
    updates.slug = await findUniqueSlug(baseSlug);
  }

  const [updated] = await db
    .update(houseComponent)
    .set(updates)
    .where(and(eq(houseComponent.slug, slug), eq(houseComponent.userId, userId)))
    .returning();

  return updated;
}

export async function deleteHouseComponent(userId: string, slug: string) {
  const [deleted] = await db
    .delete(houseComponent)
    .where(and(eq(houseComponent.slug, slug), eq(houseComponent.userId, userId)))
    .returning();

  return deleted;
}

// Build ancestor chain for breadcrumbs (from root to current)
export async function getAncestors(userId: string, componentId: number) {
  const ancestors: { id: number; name: string; slug: string }[] = [];
  let currentId: number | null = componentId;

  while (currentId) {
    const component = await db.query.houseComponent.findFirst({
      where: and(eq(houseComponent.id, currentId), eq(houseComponent.userId, userId)),
      columns: { id: true, name: true, slug: true, parentId: true },
    });

    if (!component)
      break;

    // Don't include the current component itself
    if (component.id !== componentId) {
      ancestors.unshift({ id: component.id, name: component.name, slug: component.slug });
    }
    currentId = component.parentId;
  }

  return ancestors;
}

// Get components organized as a tree structure
export async function getComponentsTree(userId: string) {
  const components = await db.query.houseComponent.findMany({
    where: eq(houseComponent.userId, userId),
    orderBy: (fields, { asc }) => asc(fields.name),
  });

  // Build a map for quick lookup
  const componentMap = new Map(components.map(c => [c.id, { ...c, children: [] as typeof components }]));

  // Separate root components and assign children
  const roots: (typeof components[0] & { children: typeof components })[] = [];

  for (const component of components) {
    const node = componentMap.get(component.id)!;
    if (component.parentId && componentMap.has(component.parentId)) {
      componentMap.get(component.parentId)!.children.push(node);
    }
    else {
      roots.push(node);
    }
  }

  return roots;
}
