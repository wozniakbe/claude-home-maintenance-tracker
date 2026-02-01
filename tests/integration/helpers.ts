import { createClient } from "@libsql/client";
import { $fetch as _$fetch } from "@nuxt/test-utils/e2e";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import * as schema from "../../lib/db/schema";

// File-based SQLite matching .env.test TURSO_DATABASE_URL
const TEST_DB_URL = "file:./test.db";

/**
 * Loads .env.test into process.env before the Nuxt server starts.
 * Must be called before setup() so the Nuxt build picks up test env vars.
 */
export function loadTestEnv() {
  const envPath = resolve(process.cwd(), ".env.test");
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#"))
      continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1)
      continue;
    const key = trimmed.slice(0, eqIndex);
    const value = trimmed.slice(eqIndex + 1);
    // eslint-disable-next-line node/no-process-env
    process.env[key] = value;
  }
}

function createTestDbClient() {
  const client = createClient({ url: TEST_DB_URL });
  return drizzle(client, { casing: "snake_case", schema });
}

/**
 * Creates all tables in the test database.
 * Called once before the test server starts so the schema is ready.
 */
export async function setupTestDatabase() {
  const db = createTestDbClient();

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
    CREATE TABLE IF NOT EXISTS session (
      id TEXT PRIMARY KEY,
      expires_at INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS account (
      id TEXT PRIMARY KEY,
      account_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      access_token TEXT,
      refresh_token TEXT,
      id_token TEXT,
      access_token_expires_at INTEGER,
      refresh_token_expires_at INTEGER,
      scope TEXT,
      password TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS verification (
      id TEXT PRIMARY KEY,
      identifier TEXT NOT NULL,
      value TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      created_at INTEGER,
      updated_at INTEGER
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
 * Truncates all application tables between tests.
 * Preserves schema but removes all data.
 */
export async function resetDatabase() {
  const db = createTestDbClient();

  // Delete in reverse dependency order
  await db.run(sql`DELETE FROM taskImage`);
  await db.run(sql`DELETE FROM task`);
  await db.run(sql`DELETE FROM maintenanceSchedule`);
  await db.run(sql`DELETE FROM houseComponent`);
  await db.run(sql`DELETE FROM verification`);
  await db.run(sql`DELETE FROM account`);
  await db.run(sql`DELETE FROM session`);
  await db.run(sql`DELETE FROM user`);
}

/**
 * Seeds a test user directly in the database.
 */
export async function seedTestUser(id = "test-user-1") {
  const db = createTestDbClient();
  const now = Date.now();
  await db.run(sql`
    INSERT OR IGNORE INTO user (id, name, email, email_verified, created_at, updated_at)
    VALUES (${id}, 'Test User', ${`${id}@test.com`}, 0, ${now}, ${now})
  `);
  return id;
}

type FetchOptions = Parameters<typeof _$fetch>[1] & { userId?: string };

// -- API response types for integration tests --

export type ApiHouseComponent = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  userId: string;
  createdAt: number;
  updatedAt: number;
};

export type ApiHouseComponentDetail = ApiHouseComponent & {
  tasks: ApiTask[];
  schedules: ApiSchedule[];
  children: ApiHouseComponent[];
  parent: ApiHouseComponent | null;
  ancestors: Array<{ id: number; name: string; slug: string }>;
};

export type ApiTask = {
  id: number;
  houseComponentId: number;
  scheduleId: number | null;
  title: string;
  description: string | null;
  status: string;
  dueAt: number | null;
  completedAt: number | null;
  createdAt: number;
};

export type ApiTaskDetail = ApiTask & {
  houseComponent: ApiHouseComponent;
  images: ApiTaskImage[];
};

export type ApiTaskImage = {
  id: number;
  taskId: number;
  userId: string;
  key: string;
  caption: string | null;
  createdAt: number;
};

export type ApiSchedule = {
  id: number;
  houseComponentId: number;
  name: string;
  description: string | null;
  intervalDays: number;
  lastCompletedAt: number | null;
  nextDueAt: number;
  createdAt: number;
};

export type ApiScheduleDetail = ApiSchedule & {
  houseComponent: ApiHouseComponent;
};

export type ApiDashboard = {
  stats: {
    componentCount: number;
    pendingTaskCount: number;
    overdueTaskCount: number;
  };
  overdueTasks: Array<ApiTask & { houseComponent: ApiHouseComponent }>;
  upcomingTasks: Array<ApiTask & { houseComponent: ApiHouseComponent }>;
  recentlyCompletedTasks: Array<ApiTask & { houseComponent: ApiHouseComponent }>;
  houseComponents: ApiHouseComponent[];
  componentsTree: Array<ApiHouseComponent & { children: ApiHouseComponent[] }>;
};

export type ApiDeleteResponse = { success: boolean };

/**
 * Makes an authenticated request to the test server.
 * Wraps $fetch with the x-test-user-id header.
 */
export function authenticatedFetch<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { userId = "test-user-1", ...fetchOptions } = options;
  return _$fetch<T>(url, {
    ...fetchOptions,
    headers: {
      ...fetchOptions.headers as Record<string, string>,
      "x-test-user-id": userId,
    },
  });
}

/**
 * Makes an authenticated request and returns the status code.
 * Does not throw on error responses - returns { status, data } instead.
 */
export async function authenticatedFetchWithStatus(
  url: string,
  options: FetchOptions = {},
): Promise<{ status: number; data: unknown }> {
  const { userId = "test-user-1", ...fetchOptions } = options;
  try {
    const data = await _$fetch(url, {
      ...fetchOptions,
      headers: {
        ...fetchOptions.headers as Record<string, string>,
        "x-test-user-id": userId,
      },
    });
    return { status: 200, data };
  }
  catch (error: unknown) {
    const fetchError = error as { response?: { status: number }; data?: unknown };
    return {
      status: fetchError.response?.status ?? 500,
      data: fetchError.data,
    };
  }
}

/**
 * Makes an unauthenticated request and returns the status code.
 * Used to test 401 responses.
 */
export async function unauthenticatedFetchWithStatus(
  url: string,
  options: Parameters<typeof _$fetch>[1] = {},
): Promise<{ status: number; data: unknown }> {
  try {
    const data = await _$fetch(url, options);
    return { status: 200, data };
  }
  catch (error: unknown) {
    const fetchError = error as { response?: { status: number }; data?: unknown };
    return {
      status: fetchError.response?.status ?? 500,
      data: fetchError.data,
    };
  }
}
