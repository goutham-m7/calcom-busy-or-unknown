# Verification evidence

Observed on 2026-11-13, macOS arm64, Node v22.23.4 / npm 10.9.9. No remote CI claim.

## Fresh-clone run

Verified source commit: 2fbb0e363ff6021323f97e5b4d38c6d74a64d5ab. The following evidence commit adds documentation and captured outputs only.

Cloned the committed repository with `git clone --quiet --no-local` into a new `/tmp/calcom-verify-*/repo` directory, then ran:

```sh
npm ci --offline
npm run check
```

The install used the already-populated local npm cache: 51 packages installed. Formatting and strict TypeScript checking passed. Vitest reported **8 files passed; 85 tests passed**. The demo exited zero and reported:

- 50 fixtures / 400 candidate slots;
- baseline 235 / 255 unsafe slots, proposed 0 / 255;
- legitimate availability preserved 145 / 145;
- exact error localization 30 / 30, zero false positives.

A second demo run's actual stdout is [evidence/demo.txt](evidence/demo.txt); measured values extracted from that clone's generated JSON are [evidence/metrics.json](evidence/metrics.json). The clone's `git status --porcelain` was empty after execution. No server was required or started.

## Acceptance traceability

| ID   | Evidence                                                                                                                                                                                                                                                            | Result                               |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| EC-1 | `tests/upstream.test.ts` executes exact pinned members and characterizes false-empty 403, 503 and missing-response success; `tests/lab.test.ts` includes mixed retry and failed-page corpus results. Source hashes verified at module load and in a dedicated test. | Pass at adapter-member boundary only |
| EC-2 | Clean-clone demo output plus `tests/lab.test.ts::fifty pinned-adapter replays satisfy safety and availability criteria`; exact expected metrics, not a nonnegative/vacuous assertion.                                                                               | 0 / 255                              |
| EC-3 | Fifty case comparisons in `tests/coverage.test.ts` plus half-open interval and minute-occupancy oracle checks in `tests/intervals.test.ts`.                                                                                                                         | 145 / 145                            |
| EC-4 | Corpus exact diagnostic comparison and malformed-ID/page/transport regressions in `tests/coverage.test.ts` and `tests/protocol.test.ts`.                                                                                                                            | 30 / 30; 0 unexpected                |
| EC-5 | Real browser click and fixture selection described below; HTML escaping and both policies tested in `tests/timeline.test.ts`.                                                                                                                                       | Pass                                 |

## Browser exercise

Opened the generated local HTML in a real cmux browser at 488 × 796 CSS pixels. The default `inner-503-1` baseline displayed `09:00FREE`. Clicking **Proposed fail-closed** changed the visible panel to `09:00UNKNOWN`, set the button's `aria-pressed=true`, and updated the live status to `incomplete coverage is unknown — cannot offer`. The separate healthy host retained eight free slots. Selecting `clean-busy-1` left exactly that case visible with one busy slot. No horizontal overflow or browser errors were observed. [Recorded state](evidence/browser.json).

The browser was closed afterward. A screenshot was inspected in-session, but the cmux screenshot path option did not persist the requested file; no screenshot file is claimed or included.

## Safety and boundaries

Before the evidence commit, searches of non-ignored project files found no workstation-specific home paths and no matches for private-key blocks, AWS access-key IDs, GitHub tokens, long API-key literals or long secret/refresh-token literals. Vendored tests contain only their upstream synthetic credential strings. No employer source, prompts or data were read into this project. No credentials, company account, Microsoft API, hosted load test, package publishing, remote repository or push was used.

Full-app OAuth, CalendarManager, booking writes and Node 24 CI execution were not exercised. The public source slice plus synthetic Graph boundary is the precise proof delivered, not a claim that an upstream patch or hosted system has been verified.
