# Busy-or-Unknown Calendar Lab

## Problem and scope
Cal.diy issue #30382 reports that Office365 Graph batch subrequest failures can resolve as empty availability. This lab replays public adapter code, not hosted Cal.com. No booking writes, accounts, credentials, LLM or hosted traffic.

## Design before implementation
Pin the public calcom/cal.diy revision and vendor the unmodified adapter, its existing tests and MIT notice. Extract availability-related class members with the TypeScript AST and execute those exact members with a synthetic Graph transport. Do not install the application monorepo or reproduce the buggy algorithm. Explicit selected calendars only; OAuth, discovery, CalendarManager and booking orchestration are outside the executable boundary.

Compare that baseline with an independent proposed reader which requires complete, valid responses for every selected calendar and every page. Unknown calendar data blocks the entire queried host window, not just the events observed before failure. Successful independent hosts remain offerable. This is a policy comparison, not a duplicate fix PR or an implementation of the pending PRs.

## Three hardest decisions
1. **Execute a source slice, not a rewrite.** A monorepo installation brings unrelated database/auth requirements; rewriting the adapter would only test our understanding. AST member extraction preserves executable method bodies and guards the expected member set. A checksum guards the full vendored source. The harness replaces authentication transport, logging, timers and the imported HTTP helper only. Rejected: hand-copied pseudo-adapter; claiming full application integration.
2. **Separate empty from incomplete.** A valid 200 with an empty value array proves free time; missing IDs, non-200 statuses, invalid bodies and incomplete pagination do not. Correlate by IDs, not response order. Reject ambiguous IDs. Retry 429 twice; retain other failures. Failed pages invalidate all coverage for their calendar. Rejected: salvaging partial free intervals without coverage proof; ignoring 404.
3. **Use an independent slot oracle.** Synthetic ground truth includes both hidden busy events and coverage uncertainty. A straightforward half-open interval feasibility check independently judges offered slots. Metrics are counts with denominators, not latency claims. Rejected: using the proposal's output as its own oracle. Shared schedule-solver/replaylab code is not assumed available or imported from another project; these small oracle/replay boundaries are implemented from scratch here.

## Interfaces and flow
Fixture JSON contains selected calendar IDs, finite ordered Graph batch frames, independent truth, expected error localization and a UTC window. Transport consumes frames, records requests, and rejects trace exhaustion. Readers return busy intervals and per-calendar unknown diagnostics. Slot evaluator applies busy/unknown/free precedence. CLI writes deterministic JSON and a self-contained HTML comparison.

## Failure and security behavior
No network transport exists in the demo. Pagination must stay on the Microsoft Graph v1.0 origin; repeated links and page budgets fail closed. No fixture body is rendered as HTML. Fixture event timestamps use the adapter's UTC representation; offset/timezone/all-day/DST behavior is out of scope. Invalid event shapes become unknown rather than free.

## Verification contract
| ID | Behavior | Proof |
| --- | --- | --- |
| EC-1 | Public adapter reproduces inner 403/503, missing IDs, mixed retry and failed-page loss | Vitest executing exact AST-extracted methods |
| EC-2 | Proposed reader offers zero blocked/unknown slots over exactly 50 fixtures | Corpus integration test + captured demo |
| EC-3 | Valid empty calendars, retries and pagination preserve legitimate slots | Exact slot-set comparison with independent truth |
| EC-4 | Errors identify calendar, phase and status/reason | Exact set comparison against fixture labels |
| EC-5 | Timeline distinguishes busy/free/unknown and toggles policies | Self-contained HTML + renderer tests + manual browser check |

## Rollout and upstream use
Do not submit another adapter patch: linked fixes #30383 and #30389 were open when checked on 2026-11-13. Port missing-response, mixed-retry and pagination traces to the existing upstream Vitest boundary, then run CalendarManager/booking tests in the full repository. This lab cannot certify those paths or the private hosted product.

## At 100× scale
Stream fixture evaluation and JSON rows, shard independent cases, cache compiled source once per pinned revision, bound event/page counts and use an interval sweep instead of the deliberately simple reference oracle. Preserve deterministic seeds, per-calendar coverage provenance and source hashes. Do not add a queue, database or service until the corpus warrants one.
