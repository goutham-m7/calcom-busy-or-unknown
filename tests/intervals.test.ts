import { expect, test } from "vitest";
import { candidateSlots, classify, truthOffers } from "../src/intervals.js";
const query = {
  dateFrom: "2026-11-16T09:00:00Z",
  dateTo: "2026-11-16T10:00:00Z",
  calendars: ["a"],
};
test("half-open adjacency leaves neighboring slots available", () => {
  const slots = candidateSlots(query);
  expect(
    classify(slots, { busy: [{ start: slots[1]!.start, end: slots[1]!.end }], errors: [] }).map(
      (s) => s.state,
    ),
  ).toEqual(["free", "busy"]);
});
test("one incomplete selected calendar blocks even apparently empty slots", () => {
  expect(
    classify(candidateSlots(query), {
      busy: [],
      errors: [{ calendar: "a", phase: "page", reason: "HTTP 503" }],
    }).map((s) => s.state),
  ).toEqual(["unknown", "unknown"]);
});
test("oracle rejects hidden events and incomplete coverage independently", () => {
  const slots = candidateSlots(query);
  expect(truthOffers(slots, { busy: [slots[0]!], unknown: [], errors: [] })).toEqual([
    slots[1]!.start,
  ]);
  expect(truthOffers(slots, { busy: [], unknown: ["a"], errors: [] })).toEqual([]);
});
test("only whole thirty-minute slots are generated", () => {
  expect(candidateSlots({ ...query, dateTo: "2026-11-16T09:45:00Z" })).toHaveLength(1);
});
test("oracle matches minute occupancy for 100 deterministic interval boundaries", () => {
  const slots = candidateSlots(query);
  for (let start = 0; start < 50; start++) {
    const from = Date.parse(query.dateFrom) + start * 60_000;
    const to = from + ((start % 7) + 1) * 60_000;
    const truth = {
      busy: [{ start: new Date(from).toISOString(), end: new Date(to).toISOString() }],
      unknown: [],
      errors: [],
    };
    const expected = slots
      .filter(
        (slot) =>
          !Array.from({ length: 30 }, (_, i) => Date.parse(slot.start) + i * 60_000).some(
            (minute) => minute >= from && minute < to,
          ),
      )
      .map((slot) => slot.start);
    expect(truthOffers(slots, truth)).toEqual(expected);
    expect(
      classify(slots, { busy: truth.busy, errors: [] })
        .filter((slot) => slot.state === "free")
        .map((slot) => slot.start),
    ).toEqual(expected);
  }
});
