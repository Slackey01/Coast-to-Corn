// Marketing/booking-preview data for the coaches. Names, bios, and photos
// still live here as static content (migrating this into the `coaches`
// table is a later step); `dbId` links each entry to the coach's real
// Supabase Auth user id so the booking preview can reflect availability
// they just saved through the real login below.
export const coaches = [
  {
    id: 'john-swanda',
    dbId: 'a8d23788-50c9-4a6a-9b5d-426ba6836dc8',
    name: 'John Swanda',
    role: 'John Swanda',
    bio: 'Add a short bio: playing background, coaching experience, specialties.',
    photo: '/images/john-swanda.jpg',
    pattern: [{ day: 1, start: 16, end: 19 }, { day: 3, start: 16, end: 19 }, { day: 6, start: 9, end: 12 }],
  },
  {
    id: 'shelby-lackey',
    dbId: 'db52820b-8ce2-4065-8e41-d9c7029c9a7b',
    name: 'Shelby Lackey',
    role: 'Shelby Lackey',
    bio: {
      hometown: 'Linden, CA',
      sections: [
        { heading: 'Playing Experience', items: [
          '2015 graduate of Linden High School in California',
          'Played at University of the Pacific in Stockton, CA, 2016–18',
          'Drafted in the 18th round in 2018 by the Colorado Rockies',
          'Top 30 prospect with the Rockies in 2021',
          'Reached Double-A',
          'Also played Indy Ball with the Lake Country DockHounds and Kane County Cougars, 2024–25',
        ] },
        { heading: 'Coaching Philosophy', items: [
          'Like many of my coaches throughout my career, my #1 coaching philosophy is for my players to BELIEVE in their abilities more than anyone else believes in them.',
          'Many young pitchers are still afraid or timid to make mistakes — I want to help develop a mindset and mechanics that allow them to ATTACK hitters.',
          'Attitude and effort are the two things we can actually control as baseball players, and I promise to get the best of both out of my players.',
        ] },
      ],
    },
    photo: '/images/shelby-lackey.jpg',
    pattern: [{ day: 2, start: 16, end: 19 }, { day: 4, start: 16, end: 19 }, { day: 6, start: 9, end: 12 }],
  },
];

export function renderCoachBio(c) {
  if (typeof c.bio === 'string') {
    return `<p>${c.bio}</p>`;
  }
  const b = c.bio;
  let html = '';
  if (b.hometown) html += `<p class="coach-bio-meta">Hometown: ${b.hometown}</p>`;
  (b.sections || []).forEach(sec => {
    html += `<div class="coach-bio-heading">${sec.heading}</div><ul class="coach-bio-list">`;
    sec.items.forEach(item => { html += `<li>${item}</li>`; });
    html += `</ul>`;
  });
  return html;
}
