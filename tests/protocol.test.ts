import { expect, test } from 'vitest';
import { readCoverage } from '../src/coverage.js';
import { upstreamAvailability } from '../src/upstream.js';
import { Replay } from '../src/replay.js';
import type { Frame } from '../src/types.js';
const query = { dateFrom: '2026-11-16T09:00:00Z', dateTo: '2026-11-16T13:00:00Z', calendars: ['a', 'b'] };
const ok = (id: number) => ({ id: String(id), status: 200, body: { value: [] } });
const frame = (responses: unknown[]): Frame => ({ outerStatus: 200, gzip: true, body: { responses } });
test('adapts upstream getAvailability field-selection regression without requesting titles', async () => {
  const replay = new Replay([frame([ok(0), ok(1)])]);
  await upstreamAvailability(query, replay.send);
  expect(replay.requests[0]![0]!.url).toContain('/me/calendars/a/calendarView');
  expect(replay.requests[0]![0]!.url).toContain('$select=showAs,start,end&');
  expect(replay.requests[0]![0]!.url).not.toContain('subject');
});
test('retries nonzero batch IDs without losing their calendar correlation', async () => {
  const throttled = { id: '1', status: 429, headers: { 'Retry-After': '0' }, body: {} };
  const replay = new Replay([frame([ok(0), throttled]), frame([throttled]), frame([ok(1)])]);
  expect(await readCoverage(query, replay.send)).toEqual({ busy: [], errors: [] });
  expect(replay.requests.map(batch => batch.map(request => request.id))).toEqual([[0, 1], [1], [1]]);
  expect(replay.requests[2]![0]!.url).toContain('/calendars/b/');
  replay.assertConsumed();
});
test('finite page budget terminates changing nextLinks', async () => {
  const frames = Array.from({ length: 17 }, (_, page) => frame([{ id: '0', status: 200, body: { value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/calendars/a/calendarView?$skiptoken=' + page } }]));
  const replay = new Replay(frames);
  expect((await readCoverage({ ...query, calendars: ['a'] }, replay.send)).errors).toEqual([{ calendar: 'a', phase: 'page', reason: 'page-budget' }]);
  replay.assertConsumed();
});
test('malformed JSON and exhausted traces remain unknown, never free', async () => {
  expect((await readCoverage(query, async () => new Response('not JSON'))).errors).toHaveLength(2);
  expect((await readCoverage(query, new Replay([]).send)).errors.map(error => error.reason)).toEqual(['transport-or-json', 'transport-or-json']);
});
test('successful free and workingElsewhere events do not suppress availability', async () => {
  for (const showAs of ['free', 'workingElsewhere']) {
    const replay = new Replay([frame([{ id: '0', status: 200, body: { value: [{ showAs, start: { dateTime: '2026-11-16T09:00:00.0000000' }, end: { dateTime: '2026-11-16T10:00:00.0000000' } }] } }])]);
    expect(await readCoverage({ ...query, calendars: ['a'] }, replay.send)).toEqual({ busy: [], errors: [] });
  }
});
