import { describe, expect, test } from 'vitest';
import { upstreamAvailability, verifyVendor } from '../src/upstream.js';
const event = { showAs: 'busy', start: { dateTime: '2026-11-16T10:00:00' }, end: { dateTime: '2026-11-16T10:30:00' } };
const params = { dateFrom: '2026-11-16T09:00:00Z', dateTo: '2026-11-16T13:00:00Z', calendars: ['a'] };
function transport(responses: unknown[]) {
  return async () => new Response(JSON.stringify({ responses }), { headers: { 'content-encoding': 'gzip' } });
}
describe('unmodified pinned availability members', () => {
  test('vendor hashes match the public revision', () => expect(verifyVendor()).toBe(true));
  test('reuses upstream busy/free/workingElsewhere filtering semantics', async () => {
    const value = [event, { ...event, showAs: 'free' }, { ...event, showAs: 'workingElsewhere' }];
    expect(await upstreamAvailability(params, transport([{ id: '0', status: 200, body: { value } }]))).toEqual([{ start: '2026-11-16T10:00:00Z', end: '2026-11-16T10:30:00Z' }]);
  });
  test.each([403, 503])('characterizes inner %i as false empty success', async status => {
    expect(await upstreamAvailability(params, transport([{ id: '0', status, body: { error: { code: 'SyntheticFailure' } } }]))).toEqual([]);
  });
  test('characterizes a missing response as false empty success', async () => {
    expect(await upstreamAvailability(params, transport([]))).toEqual([]);
  });
});
