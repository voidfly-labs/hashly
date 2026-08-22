const pad = (v) => String(v).padStart(2, '0');

/** "2026-10-05 14:03:09", in local time: what the popover's time column shows. */
export function formatTimestamp(ts) {
  const d = new Date(ts);
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

/** ISO 8601 with the UTC offset ("2026-10-05T14:03:09+02:00"): unlike the popover's local time,
 *  a CSV outlives the machine and timezone it was exported in. */
export function isoTimestamp(ts) {
  const offset = -new Date(ts).getTimezoneOffset();
  const sign = offset < 0 ? '-' : '+';
  const part = (v) => pad(Math.trunc(Math.abs(v)));
  return `${formatTimestamp(ts).replace(' ', 'T')}${sign}${part(offset / 60)}:${part(offset % 60)}`;
}
