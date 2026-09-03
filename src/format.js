export function fmtDate(d){
  return d.toLocaleDateString(undefined, { weekday:'short', month:'short', day:'numeric' });
}

export function fmtHour(h){
  const period = h >= 12 ? 'PM' : 'AM';
  let hh = h % 12; if (hh === 0) hh = 12;
  return `${hh}:00 ${period}`;
}
