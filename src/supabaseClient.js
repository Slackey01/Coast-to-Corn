// ============================================================
// Coast to Corn Performance — Supabase client setup
// ============================================================
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yafsqpjzcgwnaxvuoumx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhZnNxcGp6Y2d3bmF4dnVvdW14Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg0NjIyNjAsImV4cCI6MjEwNDAzODI2MH0.D9Q4Qb5RL9-ft4oQEPrIr3HOTMsC58vIV5GFL8VdW_o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ------------------------------------------------------------
// Coach auth helpers
// ------------------------------------------------------------

// Send a coach a magic sign-in link (no password to manage).
// Only existing accounts (the two seeded coaches) can request a link —
// shouldCreateUser:false stops randoms typing an email into the public
// footer form from self-provisioning a new auth account.
export async function signInCoach(email, redirectTo = window.location.href) {
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
  });
  if (error) throw error;
}

// Check who (if anyone) is currently logged in
export async function getCurrentCoach() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('coaches')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function signOutCoach() {
  await supabase.auth.signOut();
}

// ------------------------------------------------------------
// Availability helpers
// ------------------------------------------------------------

// Get a coach's weekly availability (public — used by the booking calendar)
export async function getCoachAvailability(coachId) {
  const { data, error } = await supabase
    .from('coach_availability')
    .select('day_of_week, start_hour, end_hour')
    .eq('coach_id', coachId);

  if (error) throw error;
  return data;
}

// Save the logged-in coach's availability for one day
// (RLS in the schema ensures a coach can only write their own rows)
export async function saveAvailabilityDay(coachId, dayOfWeek, startHour, endHour) {
  const { error } = await supabase
    .from('coach_availability')
    .upsert({ coach_id: coachId, day_of_week: dayOfWeek, start_hour: startHour, end_hour: endHour },
             { onConflict: 'coach_id, day_of_week' });

  if (error) throw error;
}

// Remove a day from the logged-in coach's availability
export async function removeAvailabilityDay(coachId, dayOfWeek) {
  const { error } = await supabase
    .from('coach_availability')
    .delete()
    .eq('coach_id', coachId)
    .eq('day_of_week', dayOfWeek);

  if (error) throw error;
}

// ------------------------------------------------------------
// Booking helpers
// ------------------------------------------------------------

export async function createBooking(booking) {
  // booking: { coach_id, lesson_type, is_member, payment_method,
  //            parent_name, player_name, email, phone,
  //            booking_date, booking_hour }
  const { error } = await supabase.from('bookings').insert(booking);
  if (error) throw error;
}

export async function getBookedSlots(coachId, fromDate, toDate) {
  const { data, error } = await supabase
    .from('bookings')
    .select('booking_date, booking_hour')
    .eq('coach_id', coachId)
    .gte('booking_date', fromDate)
    .lte('booking_date', toDate);

  if (error) throw error;
  return data;
}
