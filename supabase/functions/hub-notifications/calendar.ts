/** Public Google Calendar iCalendar feed parser. Hash identifiers so raw UIDs never leave the backend. */
export function readIcalEvents(text: string): Array<{uid: string; title: string; startLabel: string}> {
  if (!text.includes('BEGIN:VCALENDAR')) throw new Error('Il feed non è un calendario iCal valido');
  const lines = text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  let event: Record<string, string> | null = null;
  const entries: Array<{uid: string; title: string; startLabel: string}> = [];
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { event = {}; continue; }
    if (line === 'END:VEVENT') {
      if (event?.UID && event?.SUMMARY && event.STATUS !== 'CANCELLED') {
        const date = event.DTSTART?.match(/^(\d{4})(\d{2})(\d{2})/);
        entries.push({
          uid: `${event.UID}:${event['RECURRENCE-ID'] || ''}`,
          title: event.SUMMARY.replace(/\\[nN]/g, ' ').replace(/\\,/g, ',').replace(/\\;/g, ';').slice(0, 145),
          startLabel: date ? `${date[3]}/${date[2]}/${date[1]}` : '',
        });
      }
      event = null;
      continue;
    }
    if (!event) continue;
    const colon = line.indexOf(':');
    if (colon < 0) continue;
    const name = line.substring(0,colon).split(';')[0].toUpperCase();
    if (['UID','SUMMARY','DTSTART','STATUS','RECURRENCE-ID'].includes(name)) event[name] = line.substring(colon+1);
  }
  return entries.slice(0,3000);
}
export async function sha256(input: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256',new TextEncoder().encode(input));
  return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('');
}