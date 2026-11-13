import { readFileSync } from 'node:fs';
import { readCoverage } from './coverage.js';
import { candidateSlots, classify, truthOffers, type Slot } from './intervals.js';
import { Replay } from './replay.js';
import { upstreamAvailability } from './upstream.js';
import type { Diagnostic, Fixture, GraphRequest, ReadResult } from './types.js';
export interface Row { id: string; family: string; baseline: Slot[]; proposed: Slot[]; truthFree: string[]; errors: Diagnostic[]; baselineRejected: boolean; baselineRequests: GraphRequest[][]; proposedRequests: GraphRequest[][] }
export interface Metrics { fixtures: number; candidateSlots: number; blockedOrUnknownSlots: number; baselineUnsafe: number; proposedUnsafe: number; legitimateSlots: number; baselinePreserved: number; proposedPreserved: number; localizationCorrect: number; localizationExpected: number; falsePositiveErrors: number }
export interface Report { provenance: unknown; metrics: Metrics; rows: Row[] }
export async function runLab(): Promise<Report> {
  const fixtures = JSON.parse(readFileSync(new URL('../fixtures/graph.json', import.meta.url), 'utf8')) as Fixture[];
  const provenance: unknown = JSON.parse(readFileSync(new URL('../vendor/provenance.json', import.meta.url), 'utf8'));
  const metrics: Metrics = { fixtures: fixtures.length, candidateSlots: 0, blockedOrUnknownSlots: 0, baselineUnsafe: 0, proposedUnsafe: 0, legitimateSlots: 0, baselinePreserved: 0, proposedPreserved: 0, localizationCorrect: 0, localizationExpected: 0, falsePositiveErrors: 0 };
  const rows: Row[] = [];
  for (const fixture of fixtures) {
    const baselineReplay = new Replay(fixture.frames), proposedReplay = new Replay(fixture.frames);
    let baselineResult: ReadResult, baselineRejected = false;
    try { baselineResult = { busy: await upstreamAvailability(fixture.query, baselineReplay.send), errors: [] }; }
    catch { baselineRejected = true; baselineResult = { busy: [], errors: [{ calendar: '*', phase: 'initial', reason: 'adapter-rejected' }] }; }
    const proposedResult = await readCoverage(fixture.query, proposedReplay.send);
    baselineReplay.assertConsumed(); proposedReplay.assertConsumed();
    const slots = candidateSlots(fixture.query), truthFree = truthOffers(slots, fixture.truth);
    const baseline = classify(slots, baselineResult), proposed = classify(slots, proposedResult);
    metrics.candidateSlots += slots.length;
    metrics.legitimateSlots += truthFree.length;
    metrics.blockedOrUnknownSlots += slots.length - truthFree.length;
    metrics.baselineUnsafe += baseline.filter(slot => slot.state === 'free' && !truthFree.includes(slot.start)).length;
    metrics.proposedUnsafe += proposed.filter(slot => slot.state === 'free' && !truthFree.includes(slot.start)).length;
    metrics.baselinePreserved += baseline.filter(slot => slot.state === 'free' && truthFree.includes(slot.start)).length;
    metrics.proposedPreserved += proposed.filter(slot => slot.state === 'free' && truthFree.includes(slot.start)).length;
    const key = (diagnostic: Diagnostic) => JSON.stringify(diagnostic);
    const expected = new Set(fixture.truth.errors.map(key)), actual = new Set(proposedResult.errors.map(key));
    metrics.localizationExpected += expected.size;
    metrics.localizationCorrect += [...expected].filter(error => actual.has(error)).length;
    metrics.falsePositiveErrors += [...actual].filter(error => !expected.has(error)).length;
    rows.push({ id: fixture.id, family: fixture.family, baseline, proposed, truthFree, errors: proposedResult.errors, baselineRejected, baselineRequests: baselineReplay.requests, proposedRequests: proposedReplay.requests });
  }
  return { provenance, metrics, rows };
}
