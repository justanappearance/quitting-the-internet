# Decisions

## Mirror stop-gooning's stack (Vercel + Supabase REST, no framework)
- Decision: Built this as a near-identical copy of the stop-gooning tracker — static HTML/CSS/JS frontend, Vercel serverless functions in `api/`, Supabase accessed directly via its REST API (no client library, no ORM).
- Why: Same shape of problem (log a daily clean/relapsed status, show a calendar + streaks), and the existing stack is small and already proven to work.
- Rejected: A framework (Next.js/etc.), a different backend.
- Why rejected: No benefit for a single-table, low-traffic personal tracker — would just add build complexity.
- Date: 2026-07-04

## Reuse the existing Supabase project, new table `internet_entries`
- Decision: Instead of creating a second Supabase account/project, added a new table (`internet_entries`) to the same Supabase project stop-gooning uses, and reused the same `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` values as this new Vercel project's env vars.
- Why: No new signup needed, and Supabase's inactivity-pause is per-project — the keepalive cron already running for stop-gooning keeps this project's tables alive too, though this project also has its own `/api/keepalive` cron for self-containment in case the two are ever split apart.
- Rejected: Brand new Supabase project.
- Why rejected: More isolation, but not worth the extra account/setup for a low-stakes personal tracker.
- Date: 2026-07-04

## No "almost" status — only clean vs. relapsed
- Decision: Schema and UI only track two states per day (no internet / relapsed), unlike stop-gooning's three (clean/almost/folded).
- Why: User didn't want an "almost relapsed" middle state for this tracker.
- Date: 2026-07-04

## Start date: June 30, 2026
- Decision: `START_DATE` in `app.js` (both calendar start and streak-counting start) is 2026-06-30.
- Why: That's the day the user restarted this attempt at quitting the internet.
- Date: 2026-07-04
