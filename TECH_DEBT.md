# Technical Debt & Improvements

Areas to address for maintainability, performance, and code quality.

---

## Testing

### ~~No Test Coverage~~ ✅
~~Currently zero tests.~~ 228 tests implemented:
- ~~Unit tests for query functions and utilities~~ ✅ 150 unit tests (schemas + query functions)
- ~~API endpoint tests (integration)~~ ✅ 78 integration tests (components, tasks, schedules, dashboard)
- Component tests for critical UI flows (forms, dialogs)
- E2E tests for core user journeys

### ~~Test Infrastructure~~ ✅
~~Need to set up Vitest (or similar) and decide on component testing strategy.~~
Vitest configured with two project configurations (unit + integration). See `vitest.config.ts`.

---

## Database & Queries

### N+1 Query in getAncestors
The `getAncestors` function loops and queries one ancestor at a time. Could use a recursive CTE or fetch all components once and build in memory.

### ~~In-Memory Filtering for Dashboard~~ (RESOLVED)
~~`getOverdueTasks`, `getUpcomingTasks`, etc. fetch all tasks then filter by userId in JS.~~ Fixed: all four dashboard queries now use `inArray` subquery to filter by userId at the DB level. `getPendingTaskCount` uses SQL `COUNT()`. `getRecentlyCompletedTasks` applies `limit` at DB level.

### Missing Database Indexes
Should add indexes on commonly queried fields:
- `task.status`
- `task.dueAt`
- `task.houseComponentId`
- `maintenanceSchedule.nextDueAt`

### No Transactions
Some operations (like completing a scheduled task and creating the next one) should be wrapped in transactions for data integrity.

---

## Type Safety

### Loose Tree Structure Types
The `ComponentNode` type in `component-tree.vue` is defined inline. Should have a shared type definition for tree structures.

### API Response Types
No shared types between API responses and frontend consumers. Consider generating types from API or using tRPC-like patterns.

---

## Error Handling

### Inconsistent Error Display
Some pages show inline alerts, others might swallow errors. Should standardize error handling with a toast/notification system.

### Image Upload Error Recovery
If S3 upload succeeds but DB confirmation fails, orphaned files remain in S3. Could add cleanup job or better error recovery.

### No Global Error Boundary
Unhandled errors could crash the page. Should add error boundaries for graceful degradation.

---

## API & Security

### No Rate Limiting
API endpoints have no rate limiting. Should add to prevent abuse.

### Repeated CSRF Pattern
`$csrfFetch` is used everywhere with the same pattern. Could create a composable that wraps common mutation patterns.

### No API Logging/Monitoring
No structured logging for API requests. Should add for debugging and monitoring.

---

## Performance

### No API Response Caching
Could benefit from caching strategies for read-heavy endpoints (component lists, dashboard).

### Large Component Detail Page
`[slug]/index.vue` is growing large. Could extract sections into sub-components.

### Image Loading
No lazy loading or progressive image loading. Gallery could benefit from thumbnails.

---

## Code Organization

### Form Validation Duplication
Some validation logic exists both in Vue components and Zod schemas. Should consolidate.

### Magic Numbers
Intervals like "7 days for upcoming" are hardcoded. Should be configurable constants.

### Utility Functions
Some date formatting is duplicated across components. Should extract to shared utilities.

---

## Developer Experience

### No Seeding Script
No easy way to populate the database with sample data for development/testing.

### ~~Missing Dev Documentation~~ (Partially Resolved)
~~CLAUDE.md covers basics, but could use more on:~~
- ~~How to run tests (once added)~~ ✅ Full testing docs in CLAUDE.md
- Database migration workflow
- Deployment process

### No CI/CD Pipeline
No automated checks on PRs (linting, tests, type checking).

---

## Infrastructure

### No Production Deployment Config
Missing Dockerfile, deployment scripts, or cloud configuration.

### No Backup Strategy
No automated database backups configured.

### S3 Lifecycle Policies
No cleanup for orphaned images or old uploads.

---

## Quick Wins

### Loading Skeletons
Replace spinners with content-shaped skeleton loaders for better perceived performance.

### Consistent Date Formatting
Use a shared date formatting utility (or library like date-fns) consistently.

### Form Auto-focus
Forms should auto-focus the first input for faster data entry.
