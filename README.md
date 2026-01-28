# Home Tracker

A home maintenance tracker that helps homeowners manage and maintain all parts of their house.

## Features

- **Track components** - Everything in a house that may need maintenance (furnace, kitchen sink, garage, etc.)
- **Organize hierarchically** - Components can contain sub-components (garage → garage door opener)
- **Schedule maintenance** - Set recurring intervals (e.g., replace furnace filter every 90 days)
- **Dashboard overview** - See upcoming, overdue, and recently completed tasks
- **Ad-hoc tasks** - One-off work items not tied to a schedule
- **Photo documentation** - Attach images to tasks to document work performed

## Tech Stack

- **Framework:** Nuxt 4 with Vue 3
- **Database:** Drizzle ORM with libSQL/Turso
- **Authentication:** better-auth with GitHub OAuth
- **UI:** Tailwind CSS v4 + DaisyUI
- **Storage:** S3-compatible (MinIO for local dev)

## Setup

```bash
npm install
cp .env.example .env  # Configure environment variables
```

## Development

```bash
# Start dev server with local database
npm run dev

# Or run separately
npm run dev:db      # Start local Turso database
npm run dev:nuxt    # Start Nuxt dev server
```

For image uploads, start MinIO:
```bash
docker compose up -d
```
Then create an `images` bucket at http://localhost:9001.

## Database

```bash
npm run db:push     # Push schema to database (dev)
npm run db:generate # Generate migrations
npm run db:migrate  # Run migrations
npm run db:studio   # Open Drizzle Studio
```

## Testing

```bash
npm run test        # Watch mode
npm run test:run    # Run once
npm run test:coverage
```

## Linting

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## Production

```bash
npm run build
npm run preview     # Preview production build
```
