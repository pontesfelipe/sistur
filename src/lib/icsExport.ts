/**
 * Geração simples de arquivos .ics (iCalendar) RFC 5545.
 * Sem dependências externas.
 */
export interface ICSEvent {
  uid: string;
  title: string;
  description?: string;
  start: Date;
  end?: Date;
  url?: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function fmt(d: Date) {
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    'T' +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    'Z'
  );
}

function escape(text = '') {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildICS(events: ICSEvent[], calName = 'SISTUR EDU') {
  const now = fmt(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SISTUR//EDU Calendar//PT',
    `X-WR-CALNAME:${escape(calName)}`,
    'CALSCALE:GREGORIAN',
  ];
  for (const ev of events) {
    const end = ev.end ?? new Date(ev.start.getTime() + 60 * 60 * 1000);
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${ev.uid}@sistur.app`);
    lines.push(`DTSTAMP:${now}`);
    lines.push(`DTSTART:${fmt(ev.start)}`);
    lines.push(`DTEND:${fmt(end)}`);
    lines.push(`SUMMARY:${escape(ev.title)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escape(ev.description)}`);
    if (ev.url) lines.push(`URL:${escape(ev.url)}`);
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadICS(filename: string, ics: string) {
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.ics') ? filename : `${filename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}