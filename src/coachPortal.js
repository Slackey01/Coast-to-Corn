import {
  supabase, signInCoach, getCurrentCoach, signOutCoach,
  getCoachAvailability, saveAvailabilityDay, removeAvailabilityDay,
} from './supabaseClient.js';
import { coaches } from './coachData.js';
import { fmtHour } from './format.js';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let session = null;
let currentCoach = null; // matching row from `coaches` table, or null once we know there isn't one
let profileError = null;
let portalDraft = null;
let sendState = { sending: false, sentTo: null, error: null };
let saveState = { saving: false, note: null, error: null };

export function showCoachPortal() {
  const section = document.getElementById('coach-portal');
  section.style.display = '';
  section.scrollIntoView({ behavior: 'smooth' });
}

export async function initCoachPortal() {
  const { data: { session: s } } = await supabase.auth.getSession();
  session = s;
  if (session) await loadCoachProfile();
  renderPortal();

  supabase.auth.onAuthStateChange(async (event, newSession) => {
    session = newSession;
    if (event === 'SIGNED_IN') {
      await loadCoachProfile();
      showCoachPortal();
    } else if (event === 'SIGNED_OUT') {
      currentCoach = null;
      portalDraft = null;
      profileError = null;
    }
    renderPortal();
  });
}

async function loadCoachProfile() {
  profileError = null;
  try {
    currentCoach = await getCurrentCoach();
    if (currentCoach) {
      const rows = await getCoachAvailability(currentCoach.id);
      portalDraft = draftFromRows(rows);
    }
  } catch (err) {
    console.error(err);
    profileError = 'Could not load your coach profile. Try refreshing the page.';
  }
}

function draftFromRows(rows) {
  const draft = {};
  for (let d = 0; d < 7; d++) {
    const row = rows.find(r => r.day_of_week === d);
    draft[d] = row
      ? { on: true, start: row.start_hour, end: row.end_hour }
      : { on: false, start: 16, end: 19 };
  }
  return draft;
}

function hourOptionsHTML(selected) {
  let html = '';
  for (let h = 6; h <= 21; h++) {
    html += `<option value="${h}" ${h === selected ? 'selected' : ''}>${fmtHour(h)}</option>`;
  }
  return html;
}

function renderPortal() {
  const body = document.getElementById('portalBody');
  if (!body) return;
  body.innerHTML = '';

  if (!session) {
    renderSignInForm(body);
    return;
  }

  if (profileError) {
    body.innerHTML = `<p class="portal-status error">${profileError}</p>`;
    body.appendChild(signOutButton());
    return;
  }

  if (!currentCoach) {
    const p = document.createElement('p');
    p.textContent = `Signed in as ${session.user.email}, but no coach profile is linked to this account.`;
    body.appendChild(p);
    body.appendChild(signOutButton());
    return;
  }

  renderAvailabilityEditor(body);
}

function renderSignInForm(body) {
  const box = document.createElement('div');
  box.className = 'portal-auth-box';

  const label = document.createElement('label');
  label.setAttribute('for', 'coachEmail');
  label.textContent = 'Coach email';
  box.appendChild(label);

  const input = document.createElement('input');
  input.type = 'email';
  input.id = 'coachEmail';
  input.placeholder = 'you@example.com';
  input.autocomplete = 'email';
  box.appendChild(input);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-gold';
  btn.textContent = sendState.sending ? 'Sending…' : 'Send Sign-In Link';
  btn.disabled = sendState.sending;
  btn.onclick = async () => {
    const email = input.value.trim();
    if (!email) return;
    sendState = { sending: true, sentTo: null, error: null };
    renderPortal();
    try {
      await signInCoach(email);
      sendState = { sending: false, sentTo: email, error: null };
    } catch (err) {
      console.error(err);
      sendState = { sending: false, sentTo: null, error: err.message || 'Could not send sign-in link.' };
    }
    renderPortal();
  };
  box.appendChild(btn);

  if (sendState.sentTo) {
    const ok = document.createElement('p');
    ok.className = 'portal-status ok';
    ok.textContent = `Check ${sendState.sentTo} for a sign-in link. It may take a minute to arrive.`;
    box.appendChild(ok);
  } else if (sendState.error) {
    const err = document.createElement('p');
    err.className = 'portal-status error';
    err.textContent = sendState.error;
    box.appendChild(err);
  } else {
    const note = document.createElement('p');
    note.className = 'field-note';
    note.textContent = 'John and Shelby — enter your coach email and we\'ll send a link to sign in, no password needed.';
    box.appendChild(note);
  }

  body.appendChild(box);
}

function signOutButton() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn btn-outline';
  btn.style.cssText = 'color:var(--field-green); border-color:var(--line-dark); margin-top:16px;';
  btn.textContent = 'Sign Out';
  btn.onclick = async () => { await signOutCoach(); };
  return btn;
}

function renderAvailabilityEditor(body) {
  const header = document.createElement('div');
  header.style.cssText = 'display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; flex-wrap:wrap; gap:12px;';
  const heading = document.createElement('div');
  heading.style.cssText = 'font-weight:700; color:var(--field-green); font-size:18px;';
  heading.textContent = `Editing hours for ${currentCoach.name}`;
  header.appendChild(heading);
  header.appendChild(signOutButton());
  body.appendChild(header);

  DAY_NAMES.forEach((name, d) => {
    const entry = portalDraft[d];
    const row = document.createElement('div');
    row.className = 'portal-day-row';

    const checkLabel = document.createElement('label');
    checkLabel.className = 'portal-day-check';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = entry.on;
    checkbox.onchange = () => { portalDraft[d].on = checkbox.checked; renderPortal(); };
    const dayLabel = document.createElement('span');
    dayLabel.textContent = name;
    checkLabel.appendChild(checkbox);
    checkLabel.appendChild(dayLabel);
    row.appendChild(checkLabel);

    const startSel = document.createElement('select');
    startSel.disabled = !entry.on;
    startSel.innerHTML = hourOptionsHTML(entry.start);
    startSel.onchange = () => { portalDraft[d].start = parseInt(startSel.value, 10); };
    row.appendChild(startSel);

    const toSpan = document.createElement('span');
    toSpan.className = 'portal-to';
    toSpan.textContent = 'to';
    row.appendChild(toSpan);

    const endSel = document.createElement('select');
    endSel.disabled = !entry.on;
    endSel.innerHTML = hourOptionsHTML(entry.end);
    endSel.onchange = () => { portalDraft[d].end = parseInt(endSel.value, 10); };
    row.appendChild(endSel);

    body.appendChild(row);
  });

  const saveRow = document.createElement('div');
  saveRow.style.marginTop = '24px';
  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.className = 'btn btn-gold';
  saveBtn.textContent = saveState.saving ? 'Saving…' : 'Save Availability';
  saveBtn.disabled = saveState.saving;
  saveBtn.onclick = () => saveAvailability(body);
  saveRow.appendChild(saveBtn);
  body.appendChild(saveRow);

  const saveNote = document.createElement('p');
  saveNote.className = saveState.error ? 'portal-status error' : 'field-note';
  saveNote.style.marginTop = '12px';
  saveNote.textContent = saveState.error
    || saveState.note
    || 'Set the days and hours you\'re available, then save. This writes straight to your real coach account and applies to the booking calendar immediately.';
  body.appendChild(saveNote);
}

async function saveAvailability(body) {
  const coachId = currentCoach.id;
  let hadInvalid = false;
  saveState = { saving: true, note: null, error: null };
  renderPortal();

  try {
    for (let d = 0; d < 7; d++) {
      const entry = portalDraft[d];
      if (entry.on) {
        if (entry.start < entry.end) {
          await saveAvailabilityDay(coachId, d, entry.start, entry.end);
        } else {
          hadInvalid = true;
        }
      } else {
        await removeAvailabilityDay(coachId, d);
      }
    }

    const rows = await getCoachAvailability(coachId);
    portalDraft = draftFromRows(rows);

    // Keep the on-page booking preview above in sync with what was just saved.
    const localCoach = coaches.find(c => c.dbId === coachId);
    if (localCoach) {
      localCoach.pattern = rows.map(r => ({ day: r.day_of_week, start: r.start_hour, end: r.end_hour }));
    }

    saveState = {
      saving: false,
      error: null,
      note: hadInvalid
        ? 'Saved — but one or more days had an end time before the start time, so those were skipped.'
        : 'Saved — the booking calendar above now reflects these hours.',
    };
  } catch (err) {
    console.error(err);
    saveState = { saving: false, note: null, error: err.message || 'Could not save availability.' };
  }
  renderPortal();
}
