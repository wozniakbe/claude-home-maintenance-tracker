import { createClient } from "@libsql/client";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";

import * as schema from "./schema";

/**
 * Creates an in-memory SQLite database for testing.
 * Returns a drizzle instance configured the same as production.
 */
export function createTestDb() {
  const client = createClient({ url: ":memory:" });
  return drizzle(client, {
    casing: "snake_case",
    schema,
  });
}

export type TestDb = ReturnType<typeof createTestDb>;

/**
 * Creates all tables in the test database.
 * Uses raw SQL since we can't use drizzle-kit push in tests.
 * Table and column names must match the Drizzle schema exactly.
 */
export async function setupTestSchema(db: TestDb) {
  // Create tables in dependency order
  // Note: Table names are camelCase, column names are snake_case (matching drizzle config)
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      email_verified INTEGER NOT NULL DEFAULT 0,
      image TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS houseComponent (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      slug TEXT NOT NULL,
      description TEXT,
      parent_id INTEGER REFERENCES houseComponent(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      UNIQUE(slug, user_id)
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS maintenanceSchedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_component_id INTEGER NOT NULL REFERENCES houseComponent(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      interval_days INTEGER NOT NULL,
      last_completed_at INTEGER,
      next_due_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS task (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      house_component_id INTEGER NOT NULL REFERENCES houseComponent(id) ON DELETE CASCADE,
      schedule_id INTEGER REFERENCES maintenanceSchedule(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      due_at INTEGER,
      completed_at INTEGER,
      created_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS taskImage (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES task(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      key TEXT NOT NULL,
      caption TEXT,
      created_at INTEGER NOT NULL
    )
  `);
}

/**
 * Seeds a test user and returns the user ID.
 */
export async function seedTestUser(db: TestDb, id = "test-user-1") {
  const now = Date.now();
  await db.run(sql`
    INSERT INTO user (id, name, email, email_verified, created_at, updated_at)
    VALUES (${id}, 'Test User', ${`${id}@test.com`}, 0, ${now}, ${now})
  `);
  return id;
}
