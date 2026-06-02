# Job Assistant

AI job application assistant for analyzing jobs against a source resume, deciding whether each job is worth applying to, and turning strong opportunities into a practical application strategy.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Next.js Route Handlers
- Supabase Postgres and Storage
- OpenAI SDK
- Zod

## Setup

1. Copy `.env.example` to `.env.local` and fill in the values.
2. Run the SQL in `supabase/migrations/001_apply_pilot_schema.sql` against the Supabase project. Existing installs should also run later migrations in order.
3. Install dependencies with `npm install`.
4. Start the app with `npm run dev`.

## Admin Gate

Set these before deploying:

```txt
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
```

`ADMIN_PASSWORD` is required for the `/login` gate. `ADMIN_SESSION_SECRET` is recommended for signing the admin session cookie; if omitted, the app falls back to `ADMIN_PASSWORD`.

The main flow is:

1. Upload resume PDF in `/settings`.
2. Add a job in `/jobs/new`.
3. Review the 0-100 fit analysis and application strategy in `/jobs/[id]`.
4. Track jobs from `/dashboard`.

Job Assistant stores the original resume as the source profile and never overwrites it. Matching produces a 0-100 score, tier, priority, and application strategy. Full application packages are generated on demand and linked to the job. Packages include resume tailoring suggestions, a cover letter, salary expectation recommendation, interview preparation questions, suggested answers, skills to emphasize, and gaps to prepare for.
