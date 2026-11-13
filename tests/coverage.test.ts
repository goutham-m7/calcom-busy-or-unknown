import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { readCoverage } from '../src/coverage.js';
import { Replay } from '../src/replay.js';
import type { Fixture } from '../src/types.js';
const fixtures = JSON.parse(readFileSync(new URL('../fixtures/graph.json', import.meta.url), 'utf8')) as Fixture[];
test.each(fixtures)('$id preserves complete coverage or localizes unknown', async fixture => {
  const replay = new Replay(fixture.frames);
  const result = await readCoverage(fixture.query, replay.send);
  expect(result.errors).toEqual(fixture.truth.errors);
  if (!result.errors.length) expect(result.busy).toEqual(fixture.truth.busy);
  replay.assertConsumed();
});
const query = { dateFrom: '2026-11-16T09:00:00Z', dateTo: '2026-11-16T13:00:00Z', calendars: ['a'] };
async function read(body: unknown) { return readCoverage(query, new Replay([{ outerStatus: 200, gzip: false, body }]).send); }
test.each([
  [{}, 'malformed-batch'],
  [{ responses: [] }, 'missing-response'],
  [{ responses: [{ id: '1', status: 200, body: { value: [] } }] }, 'unexpected-response'],
  [{ responses: [{ id: '0', status: 200, body: {} }] }, 'malformed-body'],
  [{ responses: [{ id: '0', status: 200, body: { value: [{ showAs: 'busy' }] } }] }, 'malformed-event'],
  [{ responses: [{ id: '0', status: 200, body: { value: [], '@odata.nextLink': 'https://evil.invalid/v1.0/calendarView' } }] }, 'invalid-nextLink'],
  [{ responses: [{ id: '0', status: 200, body: { value: [], '@odata.nextLink': 'https://graph.microsoft.com/v1.0.evil/calendarView' } }] }, 'invalid-nextLink'],
  [{ responses: [{ id: '0', status: 200, body: { value: [] } }, { id: '0', status: 200, body: { value: [] } }] }, 'duplicate-response'],
])('never promotes malformed data to free: %j', async (body, reason) => {
  expect((await read(body)).errors).toEqual([{ calendar: 'a', phase: 'initial', reason }]);
});
test('outer failure is localized without reading its error as events', async () => {
  const replay = new Replay([{ outerStatus: 503, gzip: false, body: {} }]);
  expect((await readCoverage(query, replay.send)).errors[0]?.reason).toBe('outer HTTP 503');
});
test('repeated nextLink terminates as unknown rather than looping', async () => {
  const next = 'https://graph.microsoft.com/v1.0/me/calendars/a/calendarView?$skiptoken=loop';
  const frame = { outerStatus: 200, gzip: true, body: { responses: [{ id: '0', status: 200, body: { value: [], '@odata.nextLink': next } }] } };
  const replay = new Replay([frame, frame]);
  expect((await readCoverage(query, replay.send)).errors[0]?.reason).toBe('pagination-cycle');
  replay.assertConsumed();
});
test('requires a nonempty unique calendar selection and a valid UTC window', async () => {
  for (const invalid of [{ ...query, calendars: [] }, { ...query, calendars: ['a', 'a'] }, { ...query, dateTo: query.dateFrom }]) {
    await expect(readCoverage(invalid, new Replay([]).send)).rejects.toThrow('Invalid query');
  }
});
