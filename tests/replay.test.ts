import { expect, test } from 'vitest';
import { Replay } from '../src/replay.js';
const frame = { outerStatus: 200, gzip: true, body: { responses: [] } };
const request = { id: 0, method: 'GET', url: '/me/calendars/a/calendarView' };
test('replay returns independent response bodies and captures actual requests', async () => {
  const replay = new Replay([frame]);
  const response = await replay.send([request]);
  expect(response.headers.get('content-encoding')).toBe('gzip');
  expect(await response.json()).toEqual(frame.body);
  expect(replay.requests).toEqual([[request]]);
  replay.assertConsumed();
});
test('trace exhaustion is explicit, never an empty success', async () => {
  await expect(new Replay([]).send([request])).rejects.toThrow('Trace exhausted');
});
test('unconsumed frames reveal a reader which skipped required pagination', () => {
  expect(() => new Replay([frame]).assertConsumed()).toThrow('Unconsumed frames: 1');
});
