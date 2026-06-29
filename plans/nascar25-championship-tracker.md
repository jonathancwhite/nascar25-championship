# NASCAR 25 Championship / League Tracker

## Context

The user wants a web app where players can run an **online NASCAR career across shared leagues**, built around the settings of the **NASCAR 25** game (by iRacing Studios). A league creator configures the league, friends join with a code, the season schedule is auto-generated, the admin sets race dates (which notify members by email), and the admin records results that roll up into each player's career profile.

**Research finding (confirmed):** NASCAR 25 has **no public API or data export** — it offers only private lobbies, a server browser, and in-game online stats. The third-party "NASCAR APIs" (Sportradar, SportsDataIO) cover *real-world* racing, not the game. Therefore **all participants and results are entered manually by the league admin**, which is consistent with the user's own requirements. The app does not integrate with the game.

This is a **greenfield build** — the project directory is empty.

## Confirmed Decisions

- **Stack:** Next.js (App Router) + TypeScript, PostgreSQL + Prisma, Tailwind CSS + shadcn/ui.
- **Auth:** Clerk.
- **Email:** Resend (with `@react-email/components` templates).
- **Hosting:** Vercel + hosted Postgres (Neon/Supabase); **Vercel Cron** drives reminder emails.
- **Schedule when races > track pool:** **Cap race count at the number of unique tracks** for the series — no track ever repeats.
- **Points:** Ship a **simplified 40-down default**, but make the points table **configurable per league** (admin can override).
- **AI drivers:** appear **per-race only** (they take grid/finish slots and affect human points) but are **excluded from the season championship table**.
- **Notifications:** immediate "race scheduled" email when a date is set/changed, plus a reminder **5 days before** (per-league configurable lead time, default 5).

## Data Model (Prisma)

Core entities and key relations (`prisma/schema.prisma`):

- **`User`** — `clerkId` (unique), `email`, `displayName`, `imageUrl`. Synced from Clerk via webhook. Local FK target for memberships/results.
- **`League`** — `name`, `series` (enum), `numberOfRaces`, `lapsPercent`, `joinCode` (unique), `pointsSystem` (JSON; null = default 40-down), `reminderLeadDays` (default 5), `status` (`setup|active|finished`), `creatorId`.
- **`LeagueMembership`** — `leagueId`, `userId`, `role` (`ADMIN|MEMBER`), `@@unique([leagueId, userId])`. Creator gets `ADMIN`.
- **`Track`** — `name`, `shortName`, `series SeriesType[]` (a track can belong to multiple series), `trackType`, `active`. Global seed pool (see seed list below).
- **`Race`** — `leagueId`, `trackId`, `round` (1..N), `scheduledAt?`, `status` (`SCHEDULED|COMPLETED|CANCELLED`), `completedAt?`, `@@unique([leagueId, round])`, index on `[scheduledAt, status]` for the cron query.
- **`RaceParticipant`** — unifying entity for "who is in this race." Links to `User`+`membershipId` for humans, or `isAi=true`+`aiName` for AI. `carNumber?`. `@@unique([raceId, userId])`. This avoids polymorphism and lets results attach uniformly.
- **`RaceResult`** — 1:1 with participant: `finishPos`, `startPos?`, `points`, `lapsLed`, `bonusPoints`, `dnf`, `status`. Points are **computed at entry time and denormalized** so standings are a simple `SUM`.
- **`EmailLog`** — `raceId?`, `userId?`, `email`, `type` (`RACE_SCHEDULED|RACE_REMINDER`), `dedupeKey` (unique, for idempotency), `resendId?`, `sentAt`.

**Enums:** `SeriesType {ARCA, TRUCK, XFINITY, CUP}`, `LeagueRole`, `RaceStatus`, `EmailType`.

**Career roll-up** (profile): aggregate `RaceResult` via `RaceParticipant where userId = :id` — starts, wins (`finishPos=1`), top-5/10, avg finish, poles (`startPos=1`), total points — grouped by league/series. AI rows (`userId IS NULL`) are naturally excluded.

## Auth (Clerk)

- `src/middleware.ts` using `clerkMiddleware()`. Public: `/`, `/sign-in`, `/sign-up`, `/api/webhooks/clerk`. Protected: `/dashboard`, `/leagues/**`, `/profile/**`.
- **Webhook sync:** `src/app/api/webhooks/clerk/route.ts` verifies the Svix signature (`svix` + `CLERK_WEBHOOK_SECRET`), handles `user.created|updated|deleted` to upsert/delete the local `User`.
- **Safety net:** `getOrCreateCurrentUser()` server helper upserts on first authenticated request if the webhook lags.
- **Authorization is per-league** (no global admin). `requireLeagueRole(leagueId, role)` helper loads the current user's membership and throws/redirects if missing or insufficient.

## Routes (App Router)

Public: `/`, `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`.

Authenticated (route group `(app)` with shared auth layout):
- `/dashboard` — user's leagues + upcoming races, create/join actions.
- `/leagues/new`, `/leagues/join` — create / join-by-code.
- `/leagues/[leagueId]` — overview (schedule, standings, members).
- `/leagues/[leagueId]/standings` — full standings.
- `/leagues/[leagueId]/races/[raceId]` — race detail.
- `/leagues/[leagueId]/manage` *(admin)* — settings, reminder lead days, **points table editor**.
- `/leagues/[leagueId]/manage/schedule` *(admin)* — swap tracks, set dates.
- `/leagues/[leagueId]/races/[raceId]/manage` *(admin)* — set participants (human + AI), enter results, mark completed.
- `/profile` and `/profile/[userId]` — career stats.

Route handlers: `/api/webhooks/clerk` (POST), `/api/cron/race-reminders` (GET, `Bearer ${CRON_SECRET}`).

**Server actions** (Zod-validated, `requireLeagueRole` on mutations, `revalidatePath` after): `createLeague`, `joinLeague`, `leaveLeague`, `updateLeagueSettings`, `swapTrack`, `setRaceDate`, `setRaceParticipants`, `enterRaceResults`.

## Schedule Randomizer & Track Swap

- **Randomizer** (on creation): load `Track` where `series` contains the league series and `active`. Fisher–Yates shuffle, take `numberOfRaces`. **Race count is capped at pool size** — the create-league form limits/validates `numberOfRaces ≤ unique tracks for that series`. Create `Race` rows `round = 1..N`, no `scheduledAt`.
- **Track swap** (`swapTrack`, admin): replacement must belong to the league series; picker offers only **tracks not already used in this league** (since no repeats). Swap changes only `trackId`; blocked if the race already has results.

## Email Flows (Resend + Vercel Cron)

Both write `EmailLog` with a unique `dedupeKey` for send-once idempotency.

- **A — Immediate "Race Scheduled"** (inside `setRaceDate`): after persisting `scheduledAt`, email all current members. `dedupeKey = ${raceId}:RACE_SCHEDULED:${scheduledAt.toISOString()}` — re-saving the same date won't re-send; a new date sends an updated notice.
- **B — 5-days-before Reminder** (daily Vercel Cron in `vercel.json`, e.g. `0 13 * * *` → `/api/cron/race-reminders`): verify `CRON_SECRET`; find `SCHEDULED` races whose date is `reminderLeadDays` away; for each member, **insert `EmailLog` first** (`dedupeKey = ${raceId}:RACE_REMINDER:${userId}`) and only send on successful insert (unique violation = already sent). Default send time configurable.

Templates via `@react-email/components`, rendered to HTML for Resend.

## Points & Standings

- **Default (40-down):** 1st=40, 2nd=35, 3rd=34, then −1 per position (floor 1), plus optional bonuses (+win, +laps led) stored in `RaceResult.bonusPoints`.
- **Configurable per league:** effective scheme stored in `League.pointsSystem` JSON (null = default); admin edits it in `/manage`. Points computed at result-entry time and persisted on `RaceResult`; recompute league results if the scheme changes.
- **Standings:** `SUM(RaceResult.points)` per **human** participant, tiebreak wins → best finishes. AI shown per-race only, excluded from the championship table.

## Track Seed (NASCAR 25, 30 tracks)

Seed `prisma/seed.ts` from the official list (nascar25.com/tracks): Bristol, Charlotte Motor Speedway, Charlotte Roval, Chicago Street Course, Circuit of The Americas, Darlington, Daytona, Dover, Echo Park Speedway, Homestead, Indianapolis, Iowa, Kansas, Las Vegas, Lime Rock, Indianapolis Raceway Park, Martinsville, Michigan, Nashville, New Hampshire, North Wilkesboro, Phoenix, Pocono, Portland, Richmond, Rockingham, Sonoma, Talladega, Texas, Watkins Glen, Worldwide Technology Raceway. Tag each with the series it's available in and a `trackType`; per-series tagging can be refined (tracks are series-locked in NASCAR 25).

## Build Order (Milestones)

- **M0 Scaffold:** `create-next-app` (TS, App Router, Tailwind), shadcn/ui init, Prisma init, Postgres wiring, env, base layout.
- **M1 Auth:** Clerk install, middleware, sign-in/up pages, Clerk webhook + `User` sync, `getOrCreateCurrentUser`.
- **M2 Leagues core:** League/Membership schema, create + join-by-code (`nanoid`), dashboard, roles.
- **M3 Tracks + schedule:** seed track pool, randomizer (capped at pool), schedule view, admin track-swap.
- **M4 Scheduling + email A:** set race date/time, immediate "scheduled" email, EmailLog.
- **M5 Cron reminders:** `/api/cron/race-reminders` + `vercel.json` cron, idempotent reminders.
- **M6 Participants + results:** participant list (human + AI), result entry, mark completed, points compute.
- **M7 Standings + profiles:** standings table, career roll-up profiles, per-league points editor.
- **M8 Polish:** validation, empty states, error/access-control review, responsive UI.
- **M9 Deploy:** Vercel project, env vars, production Clerk/Resend keys, cron verification.

## Key Packages

`@clerk/nextjs`, `svix`; `prisma`, `@prisma/client`; `resend`, `@react-email/components`, `react-email`; `zod`, `nanoid`; shadcn/ui + `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`; `date-fns`, `@tanstack/react-table`. Dev/test: `vitest`, `@testing-library/react`, `playwright`, `eslint`, `prettier`.

## Critical Files

- `prisma/schema.prisma`, `prisma/seed.ts`
- `src/middleware.ts`
- `src/app/api/webhooks/clerk/route.ts`
- `src/app/api/cron/race-reminders/route.ts`
- `vercel.json`
- `src/lib/auth.ts` (`getOrCreateCurrentUser`, `requireLeagueRole`)
- `src/lib/schedule.ts` (randomizer), `src/lib/points.ts` (points/standings)
- `src/emails/*` (React Email templates)
- Server actions under `src/app/(app)/leagues/**/actions.ts`

## Verification

- **Unit (Vitest):** randomizer (series filter, cap-at-pool, no repeats), points computation, reminder-window date math, `dedupeKey` generation.
- **Integration:** server actions vs a test Postgres (Docker / Neon branch) — create/join → swap → results → standings correct; Clerk webhook upsert; **cron idempotency** (run twice → one email per recipient).
- **Email:** preview templates via `react-email`; mock Resend in tests; one real send with a Resend test key.
- **E2E (Playwright):** Clerk test mode — create league, join as 2nd user, set date, complete race, view standings/profile.
- **Gates:** `tsc --noEmit`, ESLint, `prisma validate`.
- **Cron check:** manually GET `/api/cron/race-reminders` with the bearer secret in preview; confirm EmailLog rows and no duplicates on re-run.
