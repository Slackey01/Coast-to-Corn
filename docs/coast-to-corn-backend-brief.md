# Coast to Corn Performance — Backend Build Brief

## Current status (as of this handoff)
- Supabase project is live at https://yafsqpjzcgwnaxvuoumx.supabase.co
- Schema is applied: `coaches`, `coach_availability`, `bookings` tables exist
  with Row Level Security enabled (policies are in `supabase-schema.sql`)
- Two real coach logins exist in Supabase Auth:
  - John Swanda — user id `a8d23788-50c9-4a6a-9b5d-426ba6836dc8`
  - Shelby Lackey — user id `db52820b-8ce2-4065-8e41-d9c7029c9a7b`
- Both have matching rows in the `coaches` table (Shelby's includes his real
  bio; John's bio is still null — needs his real bio text)
- `coach_availability` has placeholder starting hours seeded for both (same
  hours as the old mockup — not their real schedules, needs real input once
  the login screen exists)
- `bookings` table is empty — no real booking flow wired up yet
- `supabaseClient.js` has the real project URL and anon public key filled in,
  plus helper functions for coach auth, availability, and bookings, ready to
  import into a real build

## What exists today
A single-file HTML/CSS/JS mockup (`index.html`) of the Coast to Corn Performance
website, built and iterated in Claude chat. It includes, all working as an
in-browser preview with no persistence:

- Marketing pages: hero, services/pricing (Individual Lesson $85/45min,
  Monthly Membership $400/mo), coach bios (John Swanda, Shelby Lackey)
- A multi-step booking flow: lesson type → membership status → coach →
  time slot → details → payment (card or cash) → confirmation
- A hidden "Coach Login" flow (footer link) where a coach picks their name
  and edits a weekly availability grid (day + start/end hour), which feeds
  the booking calendar's open time slots
- Contact info: coast2corn@gmail.com, John 515-313-5959, Shelby 209-986-0445
- Business address: 1120 NE Station Crossing Dr, Grimes, IA 50111

**Known limitation:** the booking flow, coach login, and availability editor
above all still run on in-memory JavaScript state, not the real database.
Nothing a customer or coach does on the live page persists yet, and there's
no real payment processing. The database itself (schema + RLS) is ready and
waiting to be connected.

## What needs to be built
A real backend so the site can go live for actual customers and coaches.

1. ~~**Backend platform:** stand up Supabase.~~ ✅ Done — project is live,
   schema applied, RLS policies active.
2. **Real coach authentication:** build a login screen (email/password or
   magic-link) that calls Supabase Auth for the two accounts that already
   exist, replacing the mockup's "tap your name" button. Once logged in, the
   availability editor should read/write `coach_availability` via
   `supabaseClient.js`'s helper functions instead of the in-memory `coaches`
   array. RLS already enforces that a coach can only touch their own rows —
   the frontend just needs to authenticate correctly.
3. **Real booking persistence:** the booking flow should write to the
   `bookings` table (via `createBooking()` in `supabaseClient.js`) instead of
   an in-memory Set, and the time-slot calendar should read real availability
   (`getCoachAvailability()`) plus real existing bookings
   (`getBookedSlots()`) to determine open slots.
4. **Real payments:** Stripe integration for the "card" payment path in the
   booking flow (Stripe Checkout or Payment Intents). "Cash at lesson" stays
   as a no-charge reservation, same as today.
5. **Hosting/deployment:** the site needs to move off a single static HTML
   file to somewhere it can call Supabase and Stripe securely (e.g. Vercel or
   Netlify), with any secret keys (like a Stripe secret key) stored as
   environment variables — never hardcoded in the page source. The Supabase
   anon key is fine to keep in client code; it's designed to be public.

## Suggested build order
1. ~~Stand up the Supabase project, run `supabase-schema.sql`~~ ✅ Done
2. Wire up coach auth (login screen, session handling, protect the
   availability editor behind it) — **start here**
3. Migrate coach data + availability from hardcoded JS into the database
4. Migrate the booking flow to read/write real data
5. Add Stripe for card payments
6. Deploy and connect the real domain

## Files to bring into Claude Code
- `index.html` — the current site
- `supabaseClient.js` — configured Supabase client + helper functions
- `supabase-schema.sql` — the schema that's already been applied (for
  reference / rebuilding if ever needed)
- This brief
