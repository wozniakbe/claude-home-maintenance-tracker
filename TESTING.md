# Testing Strategy

This document outlines the testing approach for Home Tracker, including test types, libraries, and implementation details.

---

## Overview

We'll implement four levels of testing:

| Level | What it tests | Speed | Confidence | Maintenance |
|-------|--------------|-------|------------|-------------|
| Unit | Individual functions | Fast | Low-Medium | Low |
| Component | Vue components in isolation | Medium | Medium | Medium |
| Integration | API endpoints with DB | Medium | High | Medium |
| E2E | Full user journeys | Slow | Highest | High |

The testing pyramid suggests more unit tests, fewer E2E tests. For this app, I'd recommend focusing on **integration tests for API endpoints** and **unit tests for query functions** as the highest value.

---

## Libraries ~~Needed~~ Installed ✅

### Core — ✅ Installed
```bash
npm install -D vitest @nuxt/test-utils @vue/test-utils happy-dom
```

| Library | Purpose |
|---------|---------|
| `vitest` | Test runner (Vite-native, fast, Jest-compatible API) |
| `@nuxt/test-utils` | Nuxt-specific testing utilities (mounting with Nuxt context, API testing) |
| `@vue/test-utils` | Vue component mounting and interaction |
| `happy-dom` | Lightweight DOM implementation for component tests |

### E2E
```bash
npm install -D @playwright/test
```

| Library | Purpose |
|---------|---------|
| `@playwright/test` | E2E testing with multi-browser support, fast execution |

### Optional Utilities
```bash
npm install -D @testing-library/vue @faker-js/faker
```

| Library | Purpose |
|---------|---------|
| `@testing-library/vue` | User-centric component testing queries |
| `@faker-js/faker` | Generate realistic test data |

---

## Configuration

### vitest.config.ts
```typescript
import { defineVitestConfig } from "@nuxt/test-utils/config";

export default defineVitestConfig({
  test: {
    environment: "nuxt",
    environmentOptions: {
      nuxt: {
        domEnvironment: "happy-dom",
      },
    },
    // Separate test directories by type
    include: ["tests/**/*.test.ts"],
    // Global test timeout
    testTimeout: 10000,
    // Coverage configuration
    coverage: {
      provider: "v8",
      include: ["lib/**", "server/**", "app/components/**"],
      exclude: ["**/*.d.ts", "lib/db/migrations/**"],
    },
  },
});
```

### package.json scripts
```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Test Organization (Hybrid Approach)

**Unit tests are co-located** with their implementation files for easy discovery:

```
lib/
├── db/
│   ├── schema/
│   │   ├── task.ts
│   │   ├── task.test.ts           # Co-located unit test
│   │   ├── house-component.ts
│   │   └── house-component.test.ts
│   └── queries/
│       ├── task.ts
│       ├── task.test.ts           # Co-located unit test
│       └── ...
```

**Integration, E2E, and shared code** live in the `tests/` directory:

```
tests/
├── integration/
│   └── api/
│       ├── house-components.test.ts
│       ├── tasks.test.ts
│       ├── schedules.test.ts
│       └── dashboard.test.ts
├── e2e/
│   ├── auth.spec.ts
│   ├── components-crud.spec.ts
│   ├── tasks-crud.spec.ts
│   └── schedules.spec.ts
└── fixtures/
    ├── users.ts
    ├── components.ts
    └── tasks.ts
```

**Benefits of hybrid approach:**
- Unit tests are immediately visible next to implementation
- When you move/rename a file, you move/rename its test
- Integration/E2E tests don't map 1:1 to files anyway
- Shared fixtures stay in one place

---

## Unit Tests

### What to Test
- Database query functions (`lib/db/queries/*`)
- Utility functions (slug generation, date helpers)
- Zod schemas (validation edge cases)

### Database Query Testing Strategy

**Query function tests: In-Memory SQLite**

Use the same libSQL driver but with an in-memory database. Tests run against real SQL, giving confidence that queries work correctly.

```typescript
// tests/integration/setup.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "~/lib/db/schema";

export async function createTestDb() {
  const client = createClient({ url: ":memory:" });
  const db = drizzle(client, { schema });

  // Run migrations or push schema
  // ...

  return db;
}
```

**Higher-level tests: Mock the Database**

For testing code that uses queries (API handlers, components), mock the query functions to avoid database setup overhead.

```typescript
vi.mock("~/lib/db/queries/house-component", () => ({
  getHouseComponentsByUserId: vi.fn(),
  getHouseComponentBySlug: vi.fn(),
  createHouseComponent: vi.fn(),
}));
```

### Example: Query Function Tests

```typescript
// tests/unit/queries/house-component.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { createTestDb, seedUser } from "../setup";
import {
  createHouseComponent,
  getHouseComponentsByUserId,
  getHouseComponentBySlug,
  getComponentsTree,
  getAncestors,
} from "~/lib/db/queries/house-component";

describe("house-component queries", () => {
  let db: TestDb;
  let userId: string;

  beforeEach(async () => {
    db = await createTestDb();
    userId = await seedUser(db);
  });

  describe("createHouseComponent", () => {
    it("creates a component with auto-generated slug", async () => {
      const component = await createHouseComponent(userId, {
        name: "Kitchen Sink",
        description: "Under the window",
      });

      expect(component.name).toBe("Kitchen Sink");
      expect(component.slug).toBe("kitchen-sink");
      expect(component.userId).toBe(userId);
    });

    it("generates unique slug when name conflicts", async () => {
      await createHouseComponent(userId, { name: "Furnace" });
      const second = await createHouseComponent(userId, { name: "Furnace" });

      expect(second.slug).toMatch(/^furnace-[a-z0-9]+$/);
    });

    it("creates component with parent", async () => {
      const parent = await createHouseComponent(userId, { name: "Garage" });
      const child = await createHouseComponent(userId, {
        name: "Garage Door",
        parentId: parent.id,
      });

      expect(child.parentId).toBe(parent.id);
    });
  });

  describe("getComponentsTree", () => {
    it("returns empty array for user with no components", async () => {
      const tree = await getComponentsTree(userId);
      expect(tree).toEqual([]);
    });

    it("nests children under parents", async () => {
      const garage = await createHouseComponent(userId, { name: "Garage" });
      await createHouseComponent(userId, {
        name: "Garage Door",
        parentId: garage.id,
      });

      const tree = await getComponentsTree(userId);

      expect(tree).toHaveLength(1);
      expect(tree[0].name).toBe("Garage");
      expect(tree[0].children).toHaveLength(1);
      expect(tree[0].children[0].name).toBe("Garage Door");
    });
  });

  describe("getAncestors", () => {
    it("returns empty array for root component", async () => {
      const component = await createHouseComponent(userId, { name: "Roof" });
      const ancestors = await getAncestors(userId, component.id);
      expect(ancestors).toEqual([]);
    });

    it("returns ancestors from root to parent", async () => {
      const house = await createHouseComponent(userId, { name: "House" });
      const garage = await createHouseComponent(userId, {
        name: "Garage",
        parentId: house.id,
      });
      const opener = await createHouseComponent(userId, {
        name: "Door Opener",
        parentId: garage.id,
      });

      const ancestors = await getAncestors(userId, opener.id);

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].name).toBe("House");
      expect(ancestors[1].name).toBe("Garage");
    });
  });
});
```

### Example: Zod Schema Tests

```typescript
// tests/unit/schemas/task.test.ts
import { describe, it, expect } from "vitest";
import { InsertTask, CompleteTask } from "~/lib/db/schema";

describe("Task schemas", () => {
  describe("InsertTask", () => {
    it("accepts valid task data", () => {
      const result = InsertTask.safeParse({
        title: "Replace filter",
        description: "Use MERV 13",
        dueAt: Date.now() + 86400000,
      });

      expect(result.success).toBe(true);
    });

    it("requires title", () => {
      const result = InsertTask.safeParse({
        description: "No title",
      });

      expect(result.success).toBe(false);
    });

    it("rejects title over 100 characters", () => {
      const result = InsertTask.safeParse({
        title: "x".repeat(101),
      });

      expect(result.success).toBe(false);
    });
  });

  describe("CompleteTask", () => {
    it("accepts completed status", () => {
      const result = CompleteTask.safeParse({ status: "completed" });
      expect(result.success).toBe(true);
    });

    it("accepts skipped status", () => {
      const result = CompleteTask.safeParse({ status: "skipped" });
      expect(result.success).toBe(true);
    });

    it("rejects invalid status", () => {
      const result = CompleteTask.safeParse({ status: "done" });
      expect(result.success).toBe(false);
    });
  });
});
```

---

## Integration Tests (API Endpoints)

### What to Test
- All API endpoints in `server/api/*`
- Authentication/authorization
- Request validation
- Response shape
- Error handling

### Testing Strategy

Use `@nuxt/test-utils` to spin up a test server and make real HTTP requests.

```typescript
// tests/integration/setup.ts
import { setup, $fetch, createPage } from "@nuxt/test-utils/e2e";

export async function setupTestServer() {
  await setup({
    server: true,
    browser: false,
  });
}

// Helper to create authenticated requests
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  userId?: string
) {
  // Set up test auth context
  // This depends on how we mock auth for tests
}
```

### Mocking Authentication

For API tests, we bypass GitHub OAuth with a test-only auth header. This is gated behind `NODE_ENV=test` so it cannot be exploited in production.

```typescript
// server/middleware/auth.ts
export default defineEventHandler(async (event) => {
  // In test mode, allow header-based auth
  if (process.env.NODE_ENV === "test") {
    const testUserId = getHeader(event, "x-test-user-id");
    if (testUserId) {
      event.context.user = { id: testUserId, name: "Test User" };
      return;
    }
  }

  // Normal auth flow...
});
```

Tests then pass the header to authenticate:

```typescript
const response = await $fetch("/api/house-components", {
  headers: { "x-test-user-id": "test-user-1" },
});
```

### Example: API Endpoint Tests

```typescript
// tests/integration/api/house-components.test.ts
import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { setup, $fetch } from "@nuxt/test-utils/e2e";
import { seedUser, seedComponent, resetDb } from "../setup";

describe("House Components API", () => {
  let testUserId: string;

  beforeAll(async () => {
    await setup({ server: true });
  });

  beforeEach(async () => {
    await resetDb();
    testUserId = await seedUser();
  });

  describe("GET /api/house-components", () => {
    it("returns empty array when no components", async () => {
      const components = await $fetch("/api/house-components", {
        headers: { "x-test-user-id": testUserId },
      });

      expect(components).toEqual([]);
    });

    it("returns user's components sorted by name", async () => {
      await seedComponent(testUserId, { name: "Zebra" });
      await seedComponent(testUserId, { name: "Alpha" });

      const components = await $fetch("/api/house-components", {
        headers: { "x-test-user-id": testUserId },
      });

      expect(components).toHaveLength(2);
      expect(components[0].name).toBe("Alpha");
      expect(components[1].name).toBe("Zebra");
    });

    it("does not return other users' components", async () => {
      const otherUser = await seedUser();
      await seedComponent(otherUser, { name: "Other's Component" });
      await seedComponent(testUserId, { name: "My Component" });

      const components = await $fetch("/api/house-components", {
        headers: { "x-test-user-id": testUserId },
      });

      expect(components).toHaveLength(1);
      expect(components[0].name).toBe("My Component");
    });
  });

  describe("POST /api/house-components", () => {
    it("creates a new component", async () => {
      const component = await $fetch("/api/house-components", {
        method: "POST",
        headers: { "x-test-user-id": testUserId },
        body: { name: "New Furnace", description: "In basement" },
      });

      expect(component.name).toBe("New Furnace");
      expect(component.slug).toBe("new-furnace");
      expect(component.description).toBe("In basement");
    });

    it("returns 409 for duplicate name", async () => {
      await seedComponent(testUserId, { name: "Furnace" });

      const response = await $fetch("/api/house-components", {
        method: "POST",
        headers: { "x-test-user-id": testUserId },
        body: { name: "Furnace" },
        ignoreResponseError: true,
      });

      expect(response.statusCode).toBe(409);
    });

    it("returns 400 for missing name", async () => {
      const response = await $fetch("/api/house-components", {
        method: "POST",
        headers: { "x-test-user-id": testUserId },
        body: { description: "No name provided" },
        ignoreResponseError: true,
      });

      expect(response.statusCode).toBe(400);
    });

    it("requires authentication", async () => {
      const response = await $fetch("/api/house-components", {
        method: "POST",
        body: { name: "Test" },
        ignoreResponseError: true,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("PUT /api/house-components/[slug]", () => {
    it("updates component name and regenerates slug", async () => {
      const original = await seedComponent(testUserId, { name: "Old Name" });

      const updated = await $fetch(`/api/house-components/${original.slug}`, {
        method: "PUT",
        headers: { "x-test-user-id": testUserId },
        body: { name: "New Name" },
      });

      expect(updated.name).toBe("New Name");
      expect(updated.slug).toBe("new-name");
    });

    it("returns 404 for non-existent component", async () => {
      const response = await $fetch("/api/house-components/not-real", {
        method: "PUT",
        headers: { "x-test-user-id": testUserId },
        body: { name: "Whatever" },
        ignoreResponseError: true,
      });

      expect(response.statusCode).toBe(404);
    });

    it("cannot update another user's component", async () => {
      const otherUser = await seedUser();
      const component = await seedComponent(otherUser, { name: "Theirs" });

      const response = await $fetch(`/api/house-components/${component.slug}`, {
        method: "PUT",
        headers: { "x-test-user-id": testUserId },
        body: { name: "Mine now" },
        ignoreResponseError: true,
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("DELETE /api/house-components/[slug]", () => {
    it("deletes component and returns it", async () => {
      const component = await seedComponent(testUserId, { name: "Doomed" });

      const deleted = await $fetch(`/api/house-components/${component.slug}`, {
        method: "DELETE",
        headers: { "x-test-user-id": testUserId },
      });

      expect(deleted.id).toBe(component.id);

      // Verify it's gone
      const response = await $fetch(`/api/house-components/${component.slug}`, {
        headers: { "x-test-user-id": testUserId },
        ignoreResponseError: true,
      });
      expect(response.statusCode).toBe(404);
    });

    it("cascades delete to tasks", async () => {
      const component = await seedComponent(testUserId, { name: "Parent" });
      await seedTask(component.id, { title: "Child Task" });

      await $fetch(`/api/house-components/${component.slug}`, {
        method: "DELETE",
        headers: { "x-test-user-id": testUserId },
      });

      // Task should be gone too (verify via direct DB query or API)
    });
  });
});
```

---

## Component Tests

### What to Test
- Form components (validation, submission)
- Interactive components (dialogs, dropdowns)
- Components with complex state

### What NOT to Test
- Pure display components (cards that just render props)
- Components that are mostly template

### Example: Form Component Test

```typescript
// tests/components/house-component-form.test.ts
import { describe, it, expect, vi } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import HouseComponentForm from "~/app/components/house-component-form.vue";

describe("HouseComponentForm", () => {
  const defaultProps = {
    availableParents: [
      { id: 1, name: "Garage", slug: "garage" },
      { id: 2, name: "Kitchen", slug: "kitchen" },
    ],
  };

  it("emits submit with form data", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: defaultProps,
    });

    await wrapper.find('input[type="text"]').setValue("New Component");
    await wrapper.find("textarea").setValue("Description here");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")).toHaveLength(1);
    expect(wrapper.emitted("submit")[0][0]).toEqual({
      name: "New Component",
      description: "Description here",
      parentId: null,
    });
  });

  it("shows validation error for empty name", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: defaultProps,
    });

    await wrapper.find("form").trigger("submit");

    expect(wrapper.text()).toContain("Name is required");
    expect(wrapper.emitted("submit")).toBeUndefined();
  });

  it("shows validation error for name over 100 chars", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: defaultProps,
    });

    await wrapper.find('input[type="text"]').setValue("x".repeat(101));
    await wrapper.find("form").trigger("submit");

    expect(wrapper.text()).toContain("100 characters or less");
  });

  it("pre-fills form when editing", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: {
        ...defaultProps,
        houseComponent: {
          id: 1,
          name: "Existing",
          description: "Already here",
          parentId: 2,
          slug: "existing",
          userId: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });

    const nameInput = wrapper.find('input[type="text"]');
    expect((nameInput.element as HTMLInputElement).value).toBe("Existing");
  });

  it("excludes current component from parent options when editing", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: {
        availableParents: [
          { id: 1, name: "Self", slug: "self" },
          { id: 2, name: "Other", slug: "other" },
        ],
        houseComponent: {
          id: 1,
          name: "Self",
          slug: "self",
          userId: "user1",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      },
    });

    const options = wrapper.findAll("select option");
    const optionTexts = options.map(o => o.text());

    expect(optionTexts).toContain("Other");
    expect(optionTexts).not.toContain("Self");
  });

  it("uses initialParentId for new components", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: {
        ...defaultProps,
        initialParentId: 1,
      },
    });

    await wrapper.find('input[type="text"]').setValue("Child Component");
    await wrapper.find("form").trigger("submit");

    expect(wrapper.emitted("submit")[0][0].parentId).toBe(1);
  });

  it("disables inputs when loading", async () => {
    const wrapper = await mountSuspended(HouseComponentForm, {
      props: {
        ...defaultProps,
        loading: true,
      },
    });

    const inputs = wrapper.findAll("input, textarea, select, button");
    inputs.forEach(input => {
      expect(input.attributes("disabled")).toBeDefined();
    });
  });
});
```

### Example: Dialog Component Test

```typescript
// tests/components/confirm-dialog.test.ts
import { describe, it, expect } from "vitest";
import { mountSuspended } from "@nuxt/test-utils/runtime";
import ConfirmDialog from "~/app/components/confirm-dialog.vue";

describe("ConfirmDialog", () => {
  const defaultProps = {
    open: true,
    title: "Confirm Action",
    message: "Are you sure?",
    confirmLabel: "Yes",
  };

  it("renders when open is true", async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: defaultProps,
    });

    expect(wrapper.text()).toContain("Confirm Action");
    expect(wrapper.text()).toContain("Are you sure?");
  });

  it("does not render when open is false", async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { ...defaultProps, open: false },
    });

    expect(wrapper.text()).not.toContain("Confirm Action");
  });

  it("emits confirm when confirm button clicked", async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: defaultProps,
    });

    await wrapper.find("button.btn-error").trigger("click");

    expect(wrapper.emitted("confirm")).toHaveLength(1);
  });

  it("emits cancel when cancel button clicked", async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: defaultProps,
    });

    await wrapper.find("button.btn-ghost").trigger("click");

    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("shows loading state on confirm button", async () => {
    const wrapper = await mountSuspended(ConfirmDialog, {
      props: { ...defaultProps, loading: true },
    });

    expect(wrapper.find(".loading-spinner").exists()).toBe(true);
    expect(wrapper.find("button.btn-error").attributes("disabled")).toBeDefined();
  });
});
```

---

## E2E Tests

### What to Test
- Critical user journeys
- Auth flows
- Multi-step processes

### Setup with Playwright

```typescript
// playwright.config.ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
});
```

### Auth Strategy for E2E

For E2E tests, we use the same `NODE_ENV=test` auth bypass. The test helper seeds a user and sets up the auth header/cookie:

```typescript
// tests/e2e/helpers.ts
export async function loginAsTestUser(page: Page) {
  // Set test auth cookie that the middleware will accept
  await page.context().addCookies([{
    name: "test-user-id",
    value: "test-user-1",
    domain: "localhost",
    path: "/",
  }]);
}
```

The auth middleware checks for this cookie in test mode, keeping E2E tests fast and independent of GitHub OAuth.

### Example: E2E Tests

```typescript
// tests/e2e/components-crud.spec.ts
import { test, expect } from "@playwright/test";
import { loginAsTestUser, resetDatabase } from "./helpers";

test.describe("Component Management", () => {
  test.beforeEach(async ({ page }) => {
    await resetDatabase();
    await loginAsTestUser(page);
  });

  test("can create a new component", async ({ page }) => {
    await page.goto("/dashboard");
    await page.click("text=Add Component");

    await page.fill('input[placeholder*="Furnace"]', "Water Heater");
    await page.fill("textarea", "In the basement");
    await page.click('button:has-text("Add Component")');

    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=Water Heater")).toBeVisible();
  });

  test("can create nested components", async ({ page }) => {
    // First create parent
    await page.goto("/dashboard/components/new");
    await page.fill('input[placeholder*="Furnace"]', "Garage");
    await page.click('button:has-text("Add Component")');

    // Then create child
    await page.click("text=Garage");
    await page.click('text=Add >> nth=0'); // Add sub-component button

    await expect(page.locator("select")).toHaveValue(/garage/i);
    await page.fill('input[placeholder*="Furnace"]', "Garage Door");
    await page.click('button:has-text("Add Component")');

    // Verify hierarchy on dashboard
    await page.goto("/dashboard");
    const garageCard = page.locator("text=Garage").first();
    await expect(garageCard).toBeVisible();
    // Child should be indented/nested
  });

  test("can edit a component", async ({ page }) => {
    // Seed a component first (via API or database)
    await page.goto("/dashboard/components/test-component");
    await page.click("text=Edit");

    await page.fill('input[type="text"]', "Updated Name");
    await page.click('button:has-text("Save Changes")');

    await expect(page.locator("h1")).toContainText("Updated Name");
  });

  test("can delete a component with confirmation", async ({ page }) => {
    await page.goto("/dashboard/components/test-component");
    await page.click("text=Delete");

    // Confirm dialog should appear
    await expect(page.locator("text=Are you sure")).toBeVisible();
    await page.click('button:has-text("Delete")');

    await expect(page).toHaveURL("/dashboard");
    await expect(page.locator("text=test-component")).not.toBeVisible();
  });
});
```

```typescript
// tests/e2e/task-lifecycle.spec.ts
import { test, expect } from "@playwright/test";

test.describe("Task Lifecycle", () => {
  test("complete task workflow", async ({ page }) => {
    await page.goto("/dashboard/components/furnace");

    // Create task
    await page.click("text=Add Task");
    await page.fill('input[placeholder*="title"]', "Replace filter");
    await page.click('button:has-text("Add Task")');

    // Verify task appears
    await expect(page.locator("text=Replace filter")).toBeVisible();

    // Complete task
    await page.click("text=Replace filter");
    await page.click('button:has-text("Mark Completed")');

    // Verify status changed
    await expect(page.locator(".badge-success")).toBeVisible();
  });

  test("scheduled task creates next occurrence", async ({ page }) => {
    // Create a schedule
    await page.goto("/dashboard/components/furnace/schedules/new");
    await page.fill('input[name="name"]', "Filter check");
    await page.click("text=Monthly");
    await page.click('button:has-text("Create Schedule")');

    // Find and complete the generated task
    await page.goto("/dashboard/components/furnace");
    await page.click("text=Filter check");
    await page.click('button:has-text("Mark Completed")');

    // New task should be created
    await page.goto("/dashboard/components/furnace");
    const tasks = page.locator('[data-testid="task-card"]');
    await expect(tasks).toHaveCount(2); // Completed + new pending
  });
});
```

---

## Test Fixtures

### Shared Test Data

```typescript
// tests/fixtures/users.ts
export const testUsers = {
  primary: {
    id: "test-user-1",
    name: "Test User",
    email: "test@example.com",
  },
  secondary: {
    id: "test-user-2",
    name: "Other User",
    email: "other@example.com",
  },
};
```

```typescript
// tests/fixtures/components.ts
import { faker } from "@faker-js/faker";

export function createComponentFixture(overrides = {}) {
  return {
    name: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    parentId: null,
    ...overrides,
  };
}

export const sampleComponents = {
  furnace: {
    name: "Furnace",
    description: "Basement HVAC unit",
  },
  waterHeater: {
    name: "Water Heater",
    description: "50 gallon tank",
  },
  garage: {
    name: "Garage",
    description: "Two-car attached",
  },
};
```

---

## Mocking External Services

### S3/MinIO Mocking

For tests involving image upload:

```typescript
// tests/mocks/s3.ts
import { vi } from "vitest";

export function mockS3Client() {
  return {
    send: vi.fn().mockResolvedValue({
      $metadata: { httpStatusCode: 200 },
    }),
  };
}

// In test setup
vi.mock("~/server/utils/create-s3-client", () => ({
  default: () => mockS3Client(),
}));
```

### Auth Mocking

```typescript
// tests/mocks/auth.ts
export function mockAuthContext(userId: string) {
  return {
    user: {
      id: userId,
      name: "Test User",
      email: "test@example.com",
    },
  };
}
```

---

## Priority Recommendations

### ~~Phase 1: Foundation~~ ✅
1. ~~Set up Vitest and basic configuration~~
2. ~~Write unit tests for all query functions in `lib/db/queries/*`~~
3. ~~Write unit tests for Zod schemas~~

### ~~Phase 2: API Coverage~~ ✅
4. ~~Set up integration test infrastructure~~
5. ~~Write tests for all API endpoints~~
6. ~~Ensure auth/authorization is tested~~

### Phase 3: Component Tests
7. Test form components (HouseComponentForm, TaskForm, ScheduleForm)
8. Test ConfirmDialog
9. Test ImageUpload (with mocked S3)

### Phase 4: E2E
10. Set up Playwright
11. Write critical path E2E tests (create component → add task → complete)
12. Add mobile viewport tests

---

## Running Tests

```bash
# Run all unit/integration tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- tests/unit/queries/task.test.ts

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E in headed mode (see browser)
npm run test:e2e -- --headed
```
