import type { Diagnostic, GraphRequest, Interval, Query, ReadResult, Transport } from './types.js';
interface Pending { id: number; calendar: string; url: string; phase: Diagnostic['phase']; retries: number; pages: number; seen: Set<string> }
const origin = 'https://graph.microsoft.com';
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function events(value: unknown[]): Interval[] | null {
  const busy: Interval[] = [];
  for (const event of value) {
    if (!record(event) || typeof event.showAs !== 'string' || !['free', 'workingElsewhere', 'busy', 'tentative', 'oof', 'unknown'].includes(event.showAs) || !record(event.start) || !record(event.end)) return null;
    const start = event.start.dateTime, end = event.end.dateTime;
    const utc = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,7})?$/;
    if (typeof start !== 'string' || typeof end !== 'string' || !utc.test(start) || !utc.test(end) || !Number.isFinite(Date.parse(start + 'Z')) || !(Date.parse(end + 'Z') > Date.parse(start + 'Z'))) return null;
    if (event.showAs !== 'free' && event.showAs !== 'workingElsewhere') busy.push({ start: new Date(start + 'Z').toISOString(), end: new Date(end + 'Z').toISOString() });
  }
  return busy;
}
/** Proposed policy: no availability claim without complete selected-calendar coverage. */
export async function readCoverage(query: Query, transport: Transport): Promise<ReadResult> {
  if (!query.calendars.length || query.calendars.some(id => !id) || new Set(query.calendars).size !== query.calendars.length || !Number.isFinite(Date.parse(query.dateFrom)) || !(Date.parse(query.dateTo) > Date.parse(query.dateFrom))) throw new Error('Invalid query');
  const result: ReadResult = { busy: [], errors: [] };
  let pending: Pending[] = query.calendars.map((calendar, id) => ({ id, calendar, url: '/me/calendars/' + encodeURIComponent(calendar) + '/calendarView?startDateTime=' + encodeURIComponent(query.dateFrom) + '&endDateTime=' + encodeURIComponent(query.dateTo) + '&$select=showAs,start,end&$top=999', phase: 'initial', retries: 0, pages: 0, seen: new Set<string>() }));
  const fail = (item: Pending, reason: string) => result.errors.push({ calendar: item.calendar, phase: item.phase, reason });
  while (pending.length) {
    const requests: GraphRequest[] = pending.map(item => ({ id: item.id, method: 'GET', url: item.url }));
    let payload: unknown;
    try {
      const response = await transport(requests);
      if (!response.ok) { pending.forEach(item => fail(item, 'outer HTTP ' + response.status)); break; }
      payload = await response.json();
    } catch { pending.forEach(item => fail(item, 'transport-or-json')); break; }
    if (!record(payload) || !Array.isArray(payload.responses)) { pending.forEach(item => fail(item, 'malformed-batch')); break; }
    const responses = payload.responses as unknown[];
    if (responses.some(response => !record(response) || !pending.some(item => String(item.id) === String(response.id)))) { pending.forEach(item => fail(item, 'unexpected-response')); break; }
    const next: Pending[] = [];
    for (const item of pending) {
      const matches = responses.filter((response): response is Record<string, unknown> => record(response) && String(response.id) === String(item.id));
      if (matches.length !== 1) { fail(item, matches.length ? 'duplicate-response' : 'missing-response'); continue; }
      const response = matches[0]!;
      if (response.status === 429 && item.retries < 2) { next.push({ ...item, retries: item.retries + 1, phase: item.phase === 'page' ? 'page' : 'retry' }); continue; }
      if (response.status !== 200) { fail(item, typeof response.status === 'number' ? 'HTTP ' + response.status : 'malformed-status'); continue; }
      if (!record(response.body) || !Array.isArray(response.body.value)) { fail(item, 'malformed-body'); continue; }
      const parsed = events(response.body.value);
      if (!parsed) { fail(item, 'malformed-event'); continue; }
      result.busy.push(...parsed);
      if (response.body['@odata.nextLink'] === undefined) continue;
      let url: URL;
      try { url = new URL(String(response.body['@odata.nextLink'])); } catch { fail(item, 'invalid-nextLink'); continue; }
      if (url.origin !== origin || !url.pathname.startsWith('/v1.0/') || url.username || url.password || url.hash) { fail(item, 'invalid-nextLink'); continue; }
      if (item.seen.has(url.href)) { fail(item, 'pagination-cycle'); continue; }
      if (item.pages >= 16) { fail(item, 'page-budget'); continue; }
      item.seen.add(url.href);
      next.push({ ...item, url: url.pathname.slice('/v1.0'.length) + url.search, phase: 'page', retries: 0, pages: item.pages + 1 });
    }
    pending = next;
  }
  return result;
}
