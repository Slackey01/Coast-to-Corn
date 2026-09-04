import { coaches, renderCoachBio, loadCoaches } from './coachData.js';
import { fmtDate, fmtHour } from './format.js';
import { showCoachPortal, initCoachPortal } from './coachPortal.js';
import { createBooking, getBookedSlots } from './supabaseClient.js';

/* ---------------- Mobile menu ---------------- */
const menuToggle = document.getElementById('menuToggle');
const navLinks = document.getElementById('navLinks');
menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', open);
});
navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  navLinks.classList.remove('open');
}));

/* ---------------- Coach marketing grid ---------------- */
function renderCoachGrid() {
  const coachGrid = document.getElementById('coachGrid');
  coachGrid.innerHTML = '';
  coaches.forEach(c => {
    const el = document.createElement('div');
    el.className = 'coach-card';
    const photoHTML = c.photo ? `<img src="${c.photo}" alt="${c.name}">` : `<span>PHOTO</span>`;
    el.innerHTML = `
      <div class="coach-photo">${photoHTML}</div>
      <div class="coach-body">
        <h3>${c.name}</h3>
        <div class="coach-role">${c.role}</div>
        ${renderCoachBio(c)}
      </div>`;
    coachGrid.appendChild(el);
  });
}

/* ---------------- Booking state ---------------- */
const lessonTypes = [
  { id: 'individual', label: 'Individual Lesson', price: 85, unit: 'session', desc: '45 min, 1-on-1 mechanical adjustments — throwing, fielding & hitting.' },
  { id: 'membership', label: 'Monthly Membership', price: 400, unit: 'month', desc: 'Unlimited visits, Trackman-tracked bullpens, individualized monthly plan. Ages 14+.' },
];

function priceLabel(lt) {
  return lt.unit === 'month' ? `$${lt.price} / mo` : `$${lt.price}`;
}

let state = {
  step: 1,
  lessonType: null,
  coachId: null,
  isMember: null, // null = n/a, true = existing member (skip payment), false = new sign-up
  paymentMethod: 'card', // 'card' or 'cash' — cash only offered for individual lessons
  slot: null, // { dateISO, hour }
  parentName: '', kidName: '', email: '', phone: '',
  cardName: '', cardNumber: '', cardExp: '', cardCvc: '',
  confirmed: false,
  bookingError: null,
};

function needsPayment() {
  return !(state.lessonType === 'membership' && state.isMember === true);
}

function getSteps() {
  return needsPayment() ? ['Lesson', 'Time', 'Details', 'Payment'] : ['Lesson', 'Time', 'Details', 'Confirm'];
}

function generateSlots(coach, bookedKeys) {
  const out = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let d = 0; d < 14; d++) {
    const date = new Date(today);
    date.setDate(date.getDate() + d);
    const dow = date.getDay();
    coach.pattern.filter(p => p.day === dow).forEach(p => {
      for (let h = p.start; h < p.end; h++) {
        const dateISO = date.toISOString().slice(0, 10);
        const key = `${dateISO}|${h}`;
        if (!bookedKeys.has(key)) {
          out.push({ dateISO, hour: h, date });
        }
      }
    });
  }
  return out;
}

function render() {
  renderProgress();
  renderBody();
}

function renderProgress() {
  const bar = document.getElementById('progressBar');
  bar.innerHTML = '';
  getSteps().forEach((label, i) => {
    const n = i + 1;
    const div = document.createElement('div');
    div.className = 'p-item' + (state.step === n ? ' active' : '') + (state.step > n ? ' done' : '');
    div.textContent = `${n}. ${label}`;
    bar.appendChild(div);
  });
}

function renderBody() {
  const body = document.getElementById('bookerBody');
  body.innerHTML = '';

  if (state.confirmed) {
    const coach = coaches.find(c => c.id === state.coachId);
    const lt = lessonTypes.find(l => l.id === state.lessonType);
    const date = new Date(state.slot.dateISO + 'T00:00:00');
    const memberBooking = !needsPayment();
    const payingCash = !memberBooking && state.lessonType === 'individual' && state.paymentMethod === 'cash';
    let noteText;
    if (memberBooking) {
      noteText = 'No charge — this visit is included in your active membership. A real confirmation email will go out here once this is connected to a live system.';
    } else if (payingCash) {
      noteText = `Slot reserved. Bring $${lt.price} cash to pay your coach at the start of the lesson. A real confirmation email will go out here once this is connected to a live system.`;
    } else {
      noteText = 'A real confirmation email will go out here once this is connected to a live email + payment system.';
    }
    body.innerHTML = `
      <div class="confirm-panel">
        <h3>You're booked, ${state.kidName || 'ballplayer'}!</h3>
        <p>${lt.label} with ${coach.name} — ${fmtDate(date)} at ${fmtHour(state.slot.hour)}.</p>
        <p class="field-note">${noteText}</p>
        <button class="btn btn-dark" id="bookAnother" style="margin-top:20px;">Book Another Lesson</button>
      </div>`;
    document.getElementById('bookAnother').onclick = () => {
      state = { ...state, step: 1, lessonType: null, coachId: null, isMember: null, paymentMethod: 'card', slot: null, confirmed: false, bookingError: null };
      render();
    };
    return;
  }

  if (state.step === 1) {
    const grid = document.createElement('div');
    grid.className = 'option-grid';
    lessonTypes.forEach(lt => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'option-card' + (state.lessonType === lt.id ? ' selected' : '');
      card.innerHTML = `<h4>${lt.label}</h4><div class="price">$${lt.price} / ${lt.unit}</div><p>${lt.desc}</p>`;
      card.onclick = () => { state.lessonType = lt.id; if (lt.id !== 'membership') state.isMember = null; state.paymentMethod = 'card'; render(); };
      grid.appendChild(card);
    });
    body.appendChild(grid);

    if (state.lessonType === 'membership') {
      const memberSub = document.createElement('div');
      memberSub.style.marginTop = '20px';
      memberSub.innerHTML = '<label>Are you already an active member?</label>';
      const mg = document.createElement('div');
      mg.className = 'coach-pick-grid';
      const options = [
        { val: true, title: 'Yes — book my session', sub: 'No charge, uses your membership' },
        { val: false, title: 'No — sign me up', sub: '$400/mo, includes this session' },
      ];
      options.forEach(o => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'coach-pick' + (state.isMember === o.val ? ' selected' : '');
        btn.innerHTML = `<strong>${o.title}</strong><span>${o.sub}</span>`;
        btn.onclick = () => { state.isMember = o.val; render(); };
        mg.appendChild(btn);
      });
      memberSub.appendChild(mg);
      body.appendChild(memberSub);
    }

    const sub = document.createElement('div');
    sub.style.marginTop = '28px';
    sub.innerHTML = '<label>Choose a coach</label>';
    const cg = document.createElement('div');
    cg.className = 'coach-pick-grid';
    coaches.forEach(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'coach-pick' + (state.coachId === c.id ? ' selected' : '');
      btn.innerHTML = `<strong>${c.name}</strong><span>${c.role}</span>`;
      btn.onclick = () => { state.coachId = c.id; render(); };
      cg.appendChild(btn);
    });
    sub.appendChild(cg);
    body.appendChild(sub);

    const step1Ready = state.lessonType && state.coachId && (state.lessonType !== 'membership' || state.isMember !== null);
    body.appendChild(navRow(false, !!step1Ready));
  }

  else if (state.step === 2) {
    const coach = coaches.find(c => c.id === state.coachId);
    body.innerHTML = '<p class="field-note">Checking open times…</p>';
    renderStep2Slots(coach);
  }

  else if (state.step === 3) {
    const grid = document.createElement('div');
    grid.className = 'form-grid';
    grid.innerHTML = `
      <div><label>Parent / Guardian Name</label><input id="f-parent" value="${state.parentName}"></div>
      <div><label>Player Name</label><input id="f-kid" value="${state.kidName}"></div>
      <div><label>Email</label><input id="f-email" type="email" value="${state.email}"></div>
      <div><label>Phone</label><input id="f-phone" type="tel" value="${state.phone}"></div>
    `;
    body.appendChild(grid);
    body.appendChild(navRow(true, true, () => {
      state.parentName = document.getElementById('f-parent').value;
      state.kidName = document.getElementById('f-kid').value;
      state.email = document.getElementById('f-email').value;
      state.phone = document.getElementById('f-phone').value;
      return state.parentName && state.kidName && state.email;
    }));
  }

  else if (state.step === 4) {
    const coach = coaches.find(c => c.id === state.coachId);
    const lt = lessonTypes.find(l => l.id === state.lessonType);
    const date = new Date(state.slot.dateISO + 'T00:00:00');
    const payment = needsPayment();
    const cashEligible = payment && state.lessonType === 'individual';
    const payingCash = cashEligible && state.paymentMethod === 'cash';

    if (cashEligible) {
      const methodSub = document.createElement('div');
      methodSub.style.marginBottom = '24px';
      methodSub.innerHTML = '<label>How will you pay?</label>';
      const mg = document.createElement('div');
      mg.className = 'coach-pick-grid';
      const methods = [
        { val: 'card', title: 'Pay Online Now', sub: `${priceLabel(lt)} by card` },
        { val: 'cash', title: 'Pay Cash at Lesson', sub: `${priceLabel(lt)} due in person` },
      ];
      methods.forEach(m => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'coach-pick' + (state.paymentMethod === m.val ? ' selected' : '');
        btn.innerHTML = `<strong>${m.title}</strong><span>${m.sub}</span>`;
        btn.onclick = () => { state.paymentMethod = m.val; render(); };
        mg.appendChild(btn);
      });
      methodSub.appendChild(mg);
      body.appendChild(methodSub);
    }

    const summary = document.createElement('div');
    summary.className = 'summary-box';
    summary.innerHTML = `
      <div class="summary-row"><span>${lt.label}</span><span>${coach.name}</span></div>
      <div class="summary-row"><span>Date &amp; time</span><span>${fmtDate(date)}, ${fmtHour(state.slot.hour)}</span></div>
      <div class="summary-row"><span>Player</span><span>${state.kidName || '—'}</span></div>
      <div class="summary-row total"><span>${payingCash ? 'Due at lesson' : 'Total due'}</span><span>${payment ? priceLabel(lt) : 'Included in membership'}</span></div>
    `;
    body.appendChild(summary);

    if (payment && !payingCash) {
      const grid = document.createElement('div');
      grid.className = 'form-grid';
      grid.innerHTML = `
        <div class="full"><label>Name on Card</label><input id="p-name" value="${state.cardName}"></div>
        <div class="full"><label>Card Number</label><input id="p-num" inputmode="numeric" placeholder="•••• •••• •••• ••••" value="${state.cardNumber}"></div>
        <div><label>Expiry</label><input id="p-exp" placeholder="MM / YY" value="${state.cardExp}"></div>
        <div><label>CVC</label><input id="p-cvc" inputmode="numeric" placeholder="•••" value="${state.cardCvc}"></div>
      `;
      body.appendChild(grid);

      const note = document.createElement('div');
      note.className = 'checkout-note';
      note.textContent = 'Preview checkout — no real charge is made here. Connect Stripe (or another processor) on the backend to accept real payments.';
      body.appendChild(note);
    } else if (payingCash) {
      const note = document.createElement('div');
      note.className = 'checkout-note';
      note.textContent = `This reserves the time slot. Bring $${lt.price} cash to pay your coach at the start of the lesson.`;
      body.appendChild(note);
    } else {
      const note = document.createElement('div');
      note.className = 'checkout-note';
      note.textContent = 'No payment needed — this session is covered by your active membership. A live version would confirm membership status against real member records before skipping checkout.';
      body.appendChild(note);
    }

    if (state.bookingError) {
      const err = document.createElement('p');
      err.className = 'portal-status error';
      err.style.marginTop = '16px';
      err.textContent = state.bookingError;
      body.appendChild(err);
    }

    const row = document.createElement('div');
    row.className = 'booker-nav';
    const back = document.createElement('button');
    back.className = 'btn btn-outline'; back.style.color = 'var(--field-green)'; back.style.borderColor = 'var(--line-dark)';
    back.textContent = 'Back';
    back.onclick = () => { state.step -= 1; render(); };
    const confirm = document.createElement('button');
    confirm.className = 'btn btn-gold';
    const confirmLabel = !payment
      ? 'Confirm & Reserve Session'
      : payingCash
        ? `Reserve — Pay ${priceLabel(lt)} Cash at Lesson`
        : `Confirm & Book — ${priceLabel(lt)}`;
    confirm.textContent = confirmLabel;
    confirm.onclick = async () => {
      state.bookingError = null;
      confirm.disabled = true;
      confirm.textContent = 'Booking…';
      try {
        await createBooking({
          coach_id: coach.id,
          lesson_type: state.lessonType,
          is_member: state.lessonType === 'membership' && state.isMember === true,
          payment_method: payment ? state.paymentMethod : null,
          parent_name: state.parentName,
          player_name: state.kidName,
          email: state.email,
          phone: state.phone || null,
          booking_date: state.slot.dateISO,
          booking_hour: state.slot.hour,
        });
        state.confirmed = true;
      } catch (err) {
        console.error(err);
        const alreadyTaken = err.code === '23505' || /duplicate key|unique constraint/i.test(err.message || '');
        state.bookingError = alreadyTaken
          ? 'That time slot was just booked by someone else — go back and pick a different time.'
          : (err.message || 'Could not complete your booking. Please try again.');
      }
      render();
    };
    row.appendChild(back); row.appendChild(confirm);
    body.appendChild(row);
  }
}

async function renderStep2Slots(coach) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const toDate = new Date(today);
  toDate.setDate(toDate.getDate() + 13);
  const fromISO = today.toISOString().slice(0, 10);
  const toISO = toDate.toISOString().slice(0, 10);

  let bookedKeys = new Set();
  try {
    const booked = await getBookedSlots(coach.id, fromISO, toISO);
    bookedKeys = new Set(booked.map(b => `${b.booking_date}|${b.booking_hour}`));
  } catch (err) {
    console.error(err);
    // Only touch the DOM if the user hasn't navigated away while this was in flight.
    if (state.step === 2 && state.coachId === coach.id) {
      document.getElementById('bookerBody').innerHTML = '<p class="portal-status error">Could not check availability. Please try again.</p>';
    }
    return;
  }
  if (state.step !== 2 || state.coachId !== coach.id) return;

  const body = document.getElementById('bookerBody');
  body.innerHTML = '';

  const slots = generateSlots(coach, bookedKeys);
  const byDate = {};
  slots.forEach(s => { (byDate[s.dateISO] = byDate[s.dateISO] || []).push(s); });

  if (Object.keys(byDate).length === 0) {
    body.innerHTML = '<p class="no-slots">No open slots in the next two weeks for this coach. In a live version, this would show the next available dates automatically.</p>';
  } else {
    Object.keys(byDate).sort().forEach(dateISO => {
      const dayEl = document.createElement('div');
      dayEl.className = 'day-block';
      const dateObj = byDate[dateISO][0].date;
      dayEl.innerHTML = `<div class="day-label">${fmtDate(dateObj)}</div>`;
      const row = document.createElement('div');
      row.className = 'slot-row';
      byDate[dateISO].forEach(s => {
        const btn = document.createElement('button');
        btn.type = 'button';
        const isSel = state.slot && state.slot.dateISO === s.dateISO && state.slot.hour === s.hour;
        btn.className = 'slot-btn' + (isSel ? ' selected' : '');
        btn.textContent = fmtHour(s.hour);
        btn.onclick = () => { state.slot = { dateISO: s.dateISO, hour: s.hour }; render(); };
        row.appendChild(btn);
      });
      dayEl.appendChild(row);
      body.appendChild(dayEl);
    });
  }
  body.appendChild(navRow(true, !!state.slot));
}

function navRow(showBack, nextEnabled, onNext) {
  const row = document.createElement('div');
  row.className = 'booker-nav';
  if (showBack) {
    const back = document.createElement('button');
    back.className = 'btn btn-outline'; back.style.color = 'var(--field-green)'; back.style.borderColor = 'var(--line-dark)';
    back.textContent = 'Back';
    back.onclick = () => { state.step -= 1; render(); };
    row.appendChild(back);
  } else {
    row.appendChild(document.createElement('span'));
  }
  const next = document.createElement('button');
  next.className = 'btn btn-dark';
  next.textContent = 'Continue';
  next.disabled = !nextEnabled;
  next.onclick = () => {
    if (onNext && !onNext()) return;
    state.step += 1;
    render();
  };
  row.appendChild(next);
  return row;
}

document.getElementById('coachLoginLink').addEventListener('click', (e) => {
  e.preventDefault();
  showCoachPortal();
});

async function bootstrap() {
  document.getElementById('coachGrid').innerHTML = '<p class="field-note">Loading coaches…</p>';
  document.getElementById('bookerBody').innerHTML = '<p class="field-note">Loading booking options…</p>';
  try {
    await loadCoaches();
  } catch (err) {
    console.error(err);
    const errorHTML = '<p class="portal-status error">Could not load coaches. Try refreshing the page.</p>';
    document.getElementById('coachGrid').innerHTML = errorHTML;
    document.getElementById('bookerBody').innerHTML = errorHTML;
    return;
  }
  renderCoachGrid();
  render();
}

bootstrap();
initCoachPortal();
