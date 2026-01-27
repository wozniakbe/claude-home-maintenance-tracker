# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # Start dev server + local Turso DB (concurrently)
npm run dev:nuxt    # Start just Nuxt dev server
npm run dev:db      # Start just local Turso DB server
npm run build       # Build for production
npm run preview     # Preview production build locally
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix
npm run db:generate # Generate migrations from schema changes
npm run db:migrate  # Run pending migrations
npm run db:push     # Push schema directly to DB (dev only)
npm run db:studio   # Open Drizzle Studio GUI
```

## Architecture

This is a Nuxt 4 application using Vue 3 with the Composition API.

**Directory Structure (Nuxt conventions):**

- `app/` - Application source code (Nuxt 4 default)
  - `app.vue` - Root application component
  - `assets/css/main.css` - Global CSS with Tailwind and DaisyUI
  - `components/` - Vue components (auto-imported)
  - `layouts/` - Page layouts
  - `pages/` - File-based routing
  - `stores/` - Pinia stores
  - `utils/` - Utility functions (auto-imported)
- `server/` - Nitro server routes and middleware
  - `api/` - API endpoints (file-based routing)
  - `middleware/` - Server middleware
  - `utils/` - Server utilities (auto-imported in server context)
- `lib/` - Shared code (database, schemas, constants)
  - `db/schema/` - Drizzle ORM schema definitions
  - `db/queries/` - Database query functions
  - `db/migrations/` - Drizzle migrations
- `public/` - Static assets served at root

**Nuxt Auto-imports:** Components, composables, and utilities are auto-imported. No manual imports needed for Vue APIs (`ref`, `computed`, etc.) or Nuxt composables (`useRoute`, `useFetch`, etc.).

## Tech Stack

- **UI:** Tailwind CSS v4 + DaisyUI (business theme)
- **Icons:** @nuxt/icon with Tabler icons (`tabler:icon-name`)
- **Database:** Drizzle ORM with libSQL/Turso (use `http://127.0.0.1:8080` for local dev with `turso dev`)
- **Authentication:** better-auth v1.2.4 with GitHub OAuth
- **State Management:** Pinia
- **Validation:** Zod v3.24.2 + drizzle-zod v0.7.0 for schema validation
- **CSRF Protection:** nuxt-csurf
- **Linting/Formatting:** ESLint with @antfu/eslint-config (handles both linting and formatting)

**CSRF Protection:** Always use `$csrfFetch` instead of `$fetch` for POST, PUT, and DELETE requests. The `nuxt-csurf` module provides this composable which automatically includes the CSRF token.

**Version Pinning:** The `package.json` has `overrides` to pin `better-auth`, `drizzle-zod`, and `zod` versions for compatibility. Do not upgrade these without testing.

## Authentication

Uses **better-auth** with GitHub OAuth provider.

**Key files:**

- `lib/auth.ts` - better-auth configuration
- `lib/db/schema/auth.ts` - User, session, account, verification tables
- `server/api/auth/[...all].ts` - Auth API catch-all handler
- `server/middleware/auth.ts` - Populates `event.context.user`, protects `/dashboard/*` routes
- `server/utils/define-authenticated-event-handler.ts` - Helper for protected API routes
- `app/stores/auth.ts` - Pinia store with `signIn()`, `signOut()`, `user`, `loading`
- `app/components/app-navbar.vue` - Main navigation bar with auth UI

**Route Protection:** Protected routes (like `/dashboard/*`) are handled by **server middleware only** (`server/middleware/auth.ts`). Do not use client-side route middleware for auth - it causes race conditions with OAuth callbacks where the session hasn't loaded yet.

**Usage in API routes:**

```typescript
// Protected route using helper
export default defineAuthenticatedEventHandler((event) => {
  const userId = event.context.user.id;
  // ...
});
```

**Usage in components:**

```typescript
const authStore = useAuthStore();
// authStore.user - current user or undefined
// authStore.loading - true while checking session
// authStore.initialized - true after auth state is loaded
// authStore.signIn(callbackURL?) - redirect to GitHub OAuth (default: /dashboard)
// authStore.signOut() - sign out and redirect to /
```

**Important:** When binding auth methods to click handlers, use arrow functions to avoid passing the Event object as an argument:

```vue
<!-- CORRECT -->
<button @click="() => authStore.signIn()">
Sign In
</button>

<button @click="authStore.signIn('/dashboard')">
Sign In
</button>

<!-- WRONG - Event object passed as callbackURL -->
<button @click="authStore.signIn">
Sign In
</button>
```

## Code Style

ESLint is configured as both linter and formatter via @antfu/eslint-config:

- 2-space indentation
- Double quotes
- Semicolons required
- `type` keyword preferred over `interface`
- Kebab-case filenames enforced
- No direct `process.env` access (use runtime config)

**VSCode:** Format-on-save is configured via ESLint code actions in `.vscode/settings.json`.

## Development Standards

- **Readability over cleverness:** Write clear, straightforward code. Avoid overly clever solutions that are hard to understand.
- **Ask before architectural changes:** Clarify requirements and get confirmation before making significant structural changes.
- **Testable code:** Write code with testing in mind. Keep functions pure where possible, inject dependencies, and avoid tight coupling.
- **No `any` type:** Avoid using `any` in TypeScript. Use proper types, generics, or `unknown` with type guards instead.
- **Respect existing tests:** When fixing tests, fix the code or update assertions appropriately. Do not delete tests to make them pass unless the test case is genuinely obsolete.
- **No timeout-based awaits:** Never await a Promise that is simply a timeout (e.g., `await new Promise(resolve => setTimeout(resolve, 100))`). This is a hack. Fix the underlying issue with proper reactive patterns or event-driven solutions.

## Application Purpose

A home maintenance tracker that helps homeowners manage and maintain all parts of their house. Unlike a simple retrospective log, this is a **living system** that:

1. **Tracks components** - Everything in a house that may need maintenance (furnace, kitchen sink, doorbell, garage, etc.)
2. **Supports hierarchy** - Components can contain sub-components (garage → garage door opener, garage roof)
3. **Schedules preventative maintenance** - Set recurring intervals (e.g., check furnace filter every 6 months)
4. **Shows upcoming work** - Dashboard of tasks due or approaching
5. **Logs completed work** - Historical record of maintenance performed
6. **Supports ad-hoc tasks** - One-off work items not tied to a schedule (e.g., replace fire alarm batteries)
7. **Attaches images** - Photo documentation of work performed

## Data Models

### Component

_(was: house-component)_

A physical item in the house that may require maintenance. Can be hierarchical. Owned by a user.

| Field       | Type      | Description                                    |
| ----------- | --------- | ---------------------------------------------- |
| id          | int       | Primary key (auto-increment)                   |
| name        | string    | Display name (e.g., "Furnace", "Kitchen Sink") |
| slug        | string    | URL-friendly identifier (unique per user)      |
| description | string?   | Optional notes about the component             |
| parentId    | int?      | Reference to parent Component (for hierarchy)  |
| userId      | string    | Reference to User (owner)                      |
| createdAt   | timestamp | When the component was added                   |
| updatedAt   | timestamp | Last modification time                         |

### MaintenanceSchedule

_(new)_

Defines a recurring maintenance pattern for a component.

| Field           | Type       | Description                                     |
| --------------- | ---------- | ----------------------------------------------- |
| id              | string     | Primary key                                     |
| componentId     | string     | Reference to Component                          |
| name            | string     | What needs to be done (e.g., "Replace filter")  |
| description     | string?    | Detailed instructions or notes                  |
| intervalDays    | number     | How often (in days) this should occur           |
| lastCompletedAt | timestamp? | When this was last done (to calculate next due) |
| nextDueAt       | timestamp  | Calculated: when this is next due               |
| createdAt       | timestamp  | When the schedule was created                   |

### Task

_(combines aspects of: maintenance-log + new scheduled work concept)_

A unit of work - either generated from a schedule or created ad-hoc. Represents both pending work and completed history.

| Field       | Type       | Description                                                 |
| ----------- | ---------- | ----------------------------------------------------------- |
| id          | string     | Primary key                                                 |
| componentId | string     | Reference to Component                                      |
| scheduleId  | string?    | Reference to MaintenanceSchedule (null for ad-hoc)          |
| title       | string     | What needs to be done / was done                            |
| description | string?    | Details, notes, observations                                |
| status      | enum       | `pending`, `completed`, `skipped`                           |
| dueAt       | timestamp? | When this should be done (null for ad-hoc with no deadline) |
| completedAt | timestamp? | When this was completed                                     |
| createdAt   | timestamp  | When the task was created                                   |

### TaskImage

_(was: maintenance-log-image)_

Photo documentation attached to a task.

| Field     | Type      | Description                                       |
| --------- | --------- | ------------------------------------------------- |
| id        | string    | Primary key                                       |
| taskId    | string    | Reference to Task                                 |
| key       | string    | Storage key/path (e.g., `userId/taskId/uuid.jpg`) |
| caption   | string?   | Optional description                              |
| createdAt | timestamp | When uploaded                                     |

**Image URL construction:** The full URL is built at runtime by combining `config.public.s3BucketUrl` with the `key`. This allows different storage backends per environment (AWS S3 in production, MinIO locally).

## Key Workflows

1. **Add a component** → Optionally set up maintenance schedules for it
2. **View dashboard** → See tasks due soon, overdue tasks, recently completed
3. **Complete a scheduled task** → Updates schedule's lastCompletedAt, calculates next due date
4. **Create ad-hoc task** → One-off work not tied to a recurring schedule
5. **Browse history** → View all completed tasks for a component
6. **Attach photos** → Document work with images
7. **Edit a component** → Update name, description, or parent relationship
8. **Edit a schedule** → Modify interval or details; reschedules future pending tasks generated from this schedule
9. **Edit a single task** → Modify an individual task without affecting its parent schedule (e.g., change due date for just this occurrence)
10. **Delete a task** → Remove a single task (completed or pending)
11. **Delete a component** → Cascades to delete all schedules, tasks, and images associated with the component

## Reference Project

The project at `../home-maintenance-tracker` (also referred to as "the old app" or "the other app") serves as a coding style and pattern reference. Key patterns to follow:

- Drizzle schema definitions in `lib/db/schema/`
- Query functions in `lib/db/queries/`
- Server API structure in `server/api/`
- VeeValidate + Zod for form validation
- Pinia stores for client state
