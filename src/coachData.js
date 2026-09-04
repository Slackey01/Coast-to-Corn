import { getAllCoaches, getCoachAvailability } from './supabaseClient.js';

// Populated at startup by loadCoaches() from the real `coaches` +
// `coach_availability` tables. Exported as a mutable array (rather than
// reassigned) so other modules that imported it keep seeing live data.
export const coaches = [];

export async function loadCoaches() {
  const rows = await getAllCoaches();
  const withAvailability = await Promise.all(rows.map(async (row) => {
    const availRows = await getCoachAvailability(row.id);
    return {
      id: row.id,
      name: row.name,
      role: row.role,
      bio: row.bio,
      photo: row.photo_url,
      pattern: availRows.map(a => ({ day: a.day_of_week, start: a.start_hour, end: a.end_hour })),
    };
  }));
  coaches.push(...withAvailability);
}

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
