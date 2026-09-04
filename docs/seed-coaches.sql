-- ============================================================
-- Coast to Corn Performance — seed real coach profile data
-- ============================================================
-- Run this once in the Supabase dashboard: SQL Editor -> paste -> Run.
-- The app's anon key can't do this itself — coaches can only UPDATE
-- their own row (RLS), and there's no INSERT policy on `coaches` at
-- all, so this has to be run directly against the database.
--
-- This fills in the name/role/bio/photo for the two coach rows that
-- already exist (linked to their real Supabase Auth accounts) so the
-- public site and booking flow can read real data instead of the
-- hardcoded JS that used to live in src/coachData.js.
--
-- John's bio below is still the placeholder text — swap it for his
-- real bio (playing background, coaching experience, specialties)
-- whenever you have it, by re-running just his UPDATE with new text.
-- ============================================================

UPDATE coaches SET
  name = 'John Swanda',
  role = 'John Swanda',
  photo_url = '/images/john-swanda.jpg',
  bio = '"Add a short bio: playing background, coaching experience, specialties."'::jsonb
WHERE id = 'a8d23788-50c9-4a6a-9b5d-426ba6836dc8';

UPDATE coaches SET
  name = 'Shelby Lackey',
  role = 'Shelby Lackey',
  photo_url = '/images/shelby-lackey.jpg',
  bio = $$
{
  "hometown": "Linden, CA",
  "sections": [
    {
      "heading": "Playing Experience",
      "items": [
        "2015 graduate of Linden High School in California",
        "Played at University of the Pacific in Stockton, CA, 2016–18",
        "Drafted in the 18th round in 2018 by the Colorado Rockies",
        "Top 30 prospect with the Rockies in 2021",
        "Reached Double-A",
        "Also played Indy Ball with the Lake Country DockHounds and Kane County Cougars, 2024–25"
      ]
    },
    {
      "heading": "Coaching Philosophy",
      "items": [
        "Like many of my coaches throughout my career, my #1 coaching philosophy is for my players to BELIEVE in their abilities more than anyone else believes in them.",
        "Many young pitchers are still afraid or timid to make mistakes — I want to help develop a mindset and mechanics that allow them to ATTACK hitters.",
        "Attitude and effort are the two things we can actually control as baseball players, and I promise to get the best of both out of my players."
      ]
    }
  ]
}
$$::jsonb
WHERE id = 'db52820b-8ce2-4065-8e41-d9c7029c9a7b';
