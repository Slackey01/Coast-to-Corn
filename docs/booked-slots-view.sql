-- ============================================================
-- Coast to Corn Performance — public "is this slot taken" view
-- ============================================================
-- Run this once in the Supabase dashboard: SQL Editor -> paste -> Run.
--
-- The `bookings` table only lets the assigned coach SELECT their own
-- rows (RLS) — correct, since customer names/emails/phone numbers
-- shouldn't be publicly readable. But the public booking calendar
-- still needs to know which time slots are already taken, without
-- seeing who took them.
--
-- This view exposes only coach_id/date/hour for confirmed bookings.
-- Views run with their owner's privileges by default (not the
-- querying user's), so it can read the full `bookings` table while
-- only ever returning these three non-sensitive columns — granting
-- SELECT on the view to anon/authenticated does not grant any new
-- access to the underlying table itself.
-- ============================================================

create or replace view booked_slots as
  select coach_id, booking_date, booking_hour
  from bookings
  where status = 'confirmed';

grant select on booked_slots to anon, authenticated;
