-- ============================================================
-- Coast to Corn Performance — Supabase database schema
-- ============================================================
-- How to use this file:
-- 1. Create a free project at https://supabase.com
-- 2. In the Supabase dashboard, go to the SQL Editor
-- 3. Paste this entire file in and click "Run"
-- 4. This creates your tables AND locks them down with
--    Row Level Security (RLS), so coaches can only edit
--    their own data, and customers can't edit anything.
-- ============================================================

-- ------------------------------------------------------------
-- 1. COACHES
-- One row per coach, linked to their Supabase Auth login.
-- ------------------------------------------------------------
create table coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text,
  photo_url text,
  bio jsonb,               -- stores hometown / playing experience / philosophy
  created_at timestamptz default now()
);

-- ------------------------------------------------------------
-- 2. COACH AVAILABILITY
-- One row per coach per day they're available.
-- day_of_week: 0 = Sunday ... 6 = Saturday (matches JS Date.getDay())
-- start_hour / end_hour: 24-hour clock (e.g. 16 = 4:00 PM)
-- ------------------------------------------------------------
create table coach_availability (
  id bigint generated always as identity primary key,
  coach_id uuid not null references coaches(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6),
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24),
  updated_at timestamptz default now(),
  constraint valid_range check (start_hour < end_hour),
  constraint one_row_per_coach_per_day unique (coach_id, day_of_week)
);

-- ------------------------------------------------------------
-- 3. BOOKINGS
-- One row per booked session.
-- ------------------------------------------------------------
create table bookings (
  id bigint generated always as identity primary key,
  coach_id uuid not null references coaches(id),
  lesson_type text not null check (lesson_type in ('individual', 'membership')),
  is_member boolean default false,          -- true = existing member booking a covered session
  payment_method text check (payment_method in ('card', 'cash')),
  parent_name text not null,
  player_name text not null,
  email text not null,
  phone text,
  booking_date date not null,
  booking_hour int not null check (booking_hour between 0 and 23),
  status text not null default 'confirmed', -- confirmed | cancelled | completed
  created_at timestamptz default now(),
  constraint one_booking_per_slot unique (coach_id, booking_date, booking_hour)
);

-- ============================================================
-- ROW LEVEL SECURITY
-- This is what makes it "real" — the database itself enforces
-- who can see or change what, no matter what the website's
-- JavaScript says.
-- ============================================================
alter table coaches enable row level security;
alter table coach_availability enable row level security;
alter table bookings enable row level security;

-- Public website needs to display coach names/photos/bios
create policy "Anyone can view coaches"
  on coaches for select
  using (true);

-- A coach can only edit their own profile
create policy "Coaches manage their own profile"
  on coaches for update
  using (auth.uid() = id);

-- Public booking calendar needs to read open time slots
create policy "Anyone can view availability"
  on coach_availability for select
  using (true);

-- A coach can only add/change/remove THEIR OWN availability —
-- this is the piece that replaces the "pick your name" button
create policy "Coaches manage their own availability"
  on coach_availability for all
  using (auth.uid() = coach_id)
  with check (auth.uid() = coach_id);

-- Customers (who aren't logged in) can create a booking
create policy "Anyone can create a booking"
  on bookings for insert
  with check (true);

-- Only the assigned coach can view bookings tied to them
create policy "Coaches view their own bookings"
  on bookings for select
  using (auth.uid() = coach_id);

-- Only the assigned coach can update bookings tied to them
create policy "Coaches update their own bookings"
  on bookings for update
  using (auth.uid() = coach_id);

-- Only the assigned coach can delete bookings tied to them
create policy "Coaches delete their own bookings"
  on bookings for delete
  using (auth.uid() = coach_id);
