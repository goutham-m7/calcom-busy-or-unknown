import { expect, test } from 'vitest';
import { runLab } from '../src/lab.js';
test('fifty pinned-adapter replays satisfy safety and availability criteria', async () => {
  const report = await runLab();
  expect(report.rows).toHaveLength(50);
  expect(new Set(report.rows.map(row => row.id)).size).toBe(50);
  expect(report.metrics).toEqual({ fixtures: 50, candidateSlots: 400, blockedOrUnknownSlots: 255, baselineUnsafe: 235, proposedUnsafe: 0, legitimateSlots: 145, baselinePreserved: 145, proposedPreserved: 145, localizationCorrect: 30, localizationExpected: 30, falsePositiveErrors: 0 });
});
test('same failed-calendar slot flips free to unknown while a healthy host stays free', async () => {
  const report = await runLab();
  const broken = report.rows.find(row => row.id === 'inner-503-1')!;
  const healthy = report.rows.find(row => row.id === 'clean-empty-1')!;
  expect(broken.baseline[0]?.state).toBe('free');
  expect(broken.proposed[0]?.state).toBe('unknown');
  expect(healthy.proposed.every(slot => slot.state === 'free')).toBe(true);
  expect(broken.errors).toEqual([{ calendar: 'b', phase: 'initial', reason: 'HTTP 503' }]);
});
