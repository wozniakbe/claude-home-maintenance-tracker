# Implementation Plan

This document outlines the work needed to make Home Tracker a functional application, organized as user stories that can be built and tested incrementally.

---

## User Stories

Each story delivers a complete, testable feature. Stories are ordered by dependency - complete them in sequence.

### Story 1: View My House Components ✅

> As a user, I can see a list of all house components I've added to my home.

**Acceptance Criteria:**

- Dashboard shows a list of house components (or empty state if none)
- Each house component shows name and description preview
- Clicking a house component navigates to its detail page

**Technical Work:**

- `lib/db/queries/house-component.ts` - `getHouseComponentsByUserId()`
- `GET /api/house-components` - list endpoint
- `app/pages/dashboard.vue` - house component list UI
- `app/components/house-component-card.vue` - card display

**Test:** Sign in → Dashboard shows "No components yet" or lists existing house components

---

### Story 2: Add a House Component ✅

> As a user, I can add a new house component to track (e.g., "Furnace", "Kitchen Sink").

**Acceptance Criteria:**

- "Add Component" button on dashboard
- Form with name (required) and description (optional)
- After saving, redirects to dashboard showing new house component
- Slug auto-generated from name

**Technical Work:**

- `lib/db/queries/house-component.ts` - `createHouseComponent()`
- `POST /api/house-components` - create endpoint
- `app/pages/dashboard/components/new.vue` - add form page
- `app/components/house-component-form.vue` - reusable form

**Test:** Add Component → Fill form → Save → See house component in list

---

### Story 3: View House Component Details ✅

> As a user, I can view a single house component's details, tasks, and schedules.

**Acceptance Criteria:**

- Component detail page shows name, description
- Shows list of tasks for this component (empty initially)
- Shows list of maintenance schedules (empty initially)
- Edit and Delete buttons available

**Technical Work:**

- `lib/db/queries/house-component.ts` - `getHouseComponentBySlug()` (already existed)
- `GET /api/house-components/[slug]` - detail endpoint
- `app/pages/dashboard/components/[slug]/index.vue` - detail page

**Test:** Click house component → See detail page with component info

---

### Story 4: Edit a Component

> As a user, I can edit a component's name or description.

**Acceptance Criteria:**

- Edit button on component detail page
- Pre-filled form with current values
- Save updates the component
- Slug updates if name changes

**Technical Work:**

- `lib/db/queries/component.ts` - `updateComponent()`
- `PUT /api/components/[slug]` - update endpoint
- `app/pages/dashboard/components/[slug]/edit.vue` - edit page

**Test:** Edit Component → Change name → Save → See updated name

---

### Story 5: Delete a Component

> As a user, I can delete a component I no longer need.

**Acceptance Criteria:**

- Delete button with confirmation dialog
- Deleting removes component and all its tasks/schedules
- Redirects to dashboard after deletion

**Technical Work:**

- `lib/db/queries/component.ts` - `deleteComponent()`
- `DELETE /api/components/[slug]` - delete endpoint
- `app/components/confirm-dialog.vue` - reusable confirmation modal

**Test:** Delete Component → Confirm → Component removed from list

---

### Story 6: Add an Ad-hoc Task

> As a user, I can add a one-time task to a component (e.g., "Replace smoke detector batteries").

**Acceptance Criteria:**

- "Add Task" button on component detail page
- Form with title (required), description (optional), due date (optional)
- Task appears in component's task list with "pending" status

**Technical Work:**

- `lib/db/queries/task.ts` - `createTask()`
- `POST /api/components/[slug]/tasks` - create endpoint
- `app/pages/dashboard/components/[slug]/tasks/new.vue` - add task page
- `app/components/task-form.vue` - reusable form
- `app/components/task-card.vue` - task display

**Test:** Add Task → Fill form → Save → See task in component's list

---

### Story 7: Complete a Task

> As a user, I can mark a task as completed or skipped.

**Acceptance Criteria:**

- Complete/Skip buttons on task card
- Completing sets status and records completion timestamp
- Completed tasks visually distinguished (strikethrough, muted)

**Technical Work:**

- `lib/db/queries/task.ts` - `completeTask()`
- `POST /api/tasks/[id]/complete` - complete endpoint
- `app/components/task-status-badge.vue` - status indicator
- Update `task-card.vue` with complete action

**Test:** Click Complete on task → Task shows as completed with timestamp

---

### Story 8: View Task Details

> As a user, I can view a task's full details and edit it.

**Acceptance Criteria:**

- Clicking task opens detail view
- Shows title, description, status, dates
- Edit button to modify task

**Technical Work:**

- `lib/db/queries/task.ts` - `getTaskById()`
- `GET /api/tasks/[id]` - detail endpoint
- `PUT /api/tasks/[id]` - update endpoint
- `app/pages/dashboard/tasks/[id]/index.vue` - detail page
- `app/pages/dashboard/tasks/[id]/edit.vue` - edit page

**Test:** Click task → See details → Edit → Save changes

---

### Story 9: Delete a Task

> As a user, I can delete a task I no longer need.

**Acceptance Criteria:**

- Delete button on task detail page
- Confirmation before deletion
- Redirects to component page after deletion

**Technical Work:**

- `lib/db/queries/task.ts` - `deleteTask()`
- `DELETE /api/tasks/[id]` - delete endpoint

**Test:** Delete Task → Confirm → Task removed

---

### Story 10: Dashboard Overview

> As a user, my dashboard shows upcoming and overdue tasks across all components.

**Acceptance Criteria:**

- "Overdue" section showing tasks past due date
- "Upcoming" section showing tasks due in next 7 days
- "Recently Completed" section
- Quick stats (total components, pending tasks)

**Technical Work:**

- `lib/db/queries/task.ts` - `getUpcomingTasks()`, `getOverdueTasks()`
- `GET /api/tasks?filter=upcoming` - filtered list endpoint
- Update `dashboard/index.vue` with sections
- `app/components/dashboard-stats.vue` - stats widget

**Test:** With tasks at various due dates → Dashboard shows correct groupings

---

### Story 11: Create a Maintenance Schedule

> As a user, I can set up recurring maintenance for a component (e.g., "Replace furnace filter every 90 days").

**Acceptance Criteria:**

- "Add Schedule" button on component detail page
- Form with name, description, interval (days)
- Creating schedule also creates first pending task
- Schedule shows next due date

**Technical Work:**

- `lib/db/queries/maintenance-schedule.ts` - `createSchedule()`
- `POST /api/components/[slug]/schedules` - create endpoint
- `app/pages/dashboard/components/[slug]/schedules/new.vue` - add page
- `app/components/schedule-form.vue` - form with interval picker
- `app/components/schedule-card.vue` - schedule display

**Test:** Add Schedule (90 days) → See schedule + first task due in 90 days

---

### Story 12: Complete a Scheduled Task

> As a user, when I complete a scheduled task, the next occurrence is automatically created.

**Acceptance Criteria:**

- Completing a scheduled task updates the schedule's lastCompletedAt
- New task auto-created with next due date
- Schedule card shows updated "next due" date

**Technical Work:**

- `lib/db/queries/maintenance-schedule.ts` - `completeScheduledTask()`
- Update `POST /api/tasks/[id]/complete` to handle scheduled tasks

**Test:** Complete scheduled task → New task appears with future due date

---

### Story 13: Edit/Delete a Schedule

> As a user, I can modify or remove a maintenance schedule.

**Acceptance Criteria:**

- Edit schedule changes interval, recalculates next due
- Deleting schedule orphans existing tasks (they remain but aren't tied to schedule)

**Technical Work:**

- `lib/db/queries/maintenance-schedule.ts` - `updateSchedule()`, `deleteSchedule()`
- `PUT /api/schedules/[id]` - update endpoint
- `DELETE /api/schedules/[id]` - delete endpoint
- `app/pages/dashboard/schedules/[id]/edit.vue` - edit page

**Test:** Edit schedule interval → Next due date recalculates

---

### Story 14: Attach Photos to Tasks

> As a user, I can attach photos to document completed work.

**Acceptance Criteria:**

- Upload button on task detail page
- Support drag-drop or click-to-select
- Images display in gallery on task
- Can delete images

**Technical Work:**

- S3/MinIO storage configuration
- `server/utils/create-s3-client.ts`
- `lib/db/queries/task-image.ts` - CRUD functions
- `POST /api/tasks/[id]/images/sign` - signed URL endpoint
- `POST /api/tasks/[id]/images` - confirm upload
- `DELETE /api/tasks/[id]/images/[imageId]` - delete
- `app/components/image-upload.vue` - upload UI
- `app/components/image-gallery.vue` - display gallery

**Test:** Upload image → See in gallery → Delete → Image removed

---

### Story 15: Component Hierarchy

> As a user, I can organize components hierarchically (e.g., Garage → Garage Door Opener).

**Acceptance Criteria:**

- Parent selector when creating/editing component
- Child components shown nested under parent
- Breadcrumb navigation on child component pages

**Technical Work:**

- Update `component-form.vue` with parent dropdown
- `lib/db/queries/component.ts` - `getComponentsTree()`
- `app/components/component-tree.vue` - tree view display
- `app/components/breadcrumbs.vue` - navigation breadcrumbs

**Test:** Create component with parent → Shows nested in tree view

---

## Quick Reference: File Locations

| Type       | Location               | Example                                  |
| ---------- | ---------------------- | ---------------------------------------- |
| DB Queries | `lib/db/queries/`      | `component.ts`, `task.ts`                |
| API Routes | `server/api/`          | `components.get.ts`, `tasks/[id].put.ts` |
| Pages      | `app/pages/dashboard/` | `components/[slug]/index.vue`            |
| Components | `app/components/`      | `task-card.vue`, `component-form.vue`    |

---

## Milestone Checkpoints

**Milestone 1 - Component CRUD (Stories 1-5)**

> User can add, view, edit, and delete components.

**Milestone 2 - Task Management (Stories 6-9)**

> User can create ad-hoc tasks, complete them, and manage them.

**Milestone 3 - Dashboard (Story 10)**

> Dashboard shows actionable overview of upcoming work.

**Milestone 4 - Scheduled Maintenance (Stories 11-13)**

> User can set up recurring maintenance that auto-generates tasks.

**Milestone 5 - Image Uploads (Story 14)**

> User can attach photos to document work.

**Milestone 6 - Hierarchy (Story 15)**

> User can organize components in a tree structure.

---

## Notes

- All API routes use `defineAuthenticatedEventHandler` for protection
- Slugs are auto-generated from names using a utility function
- Timestamps stored as Unix milliseconds (int)
- Follow patterns from `../home-maintenance-tracker` reference project
- Run `npm run db:push` after schema changes during development
- Run `npm run lint:fix` after creating new files
