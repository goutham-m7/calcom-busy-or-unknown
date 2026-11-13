import type { Interval, Query, ReadResult, Truth } from "./types.js";
export interface Slot extends Interval {
  state: "free" | "busy" | "unknown";
}
export function candidateSlots(query: Query): Interval[] {
  const start = Date.parse(query.dateFrom),
    end = Date.parse(query.dateTo);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    throw new Error("Invalid slot window");
  const slots: Interval[] = [];
  for (let cursor = start; cursor + 1_800_000 <= end; cursor += 1_800_000)
    slots.push({
      start: new Date(cursor).toISOString(),
      end: new Date(cursor + 1_800_000).toISOString(),
    });
  return slots;
}
/** Reader-facing availability labeling. Unknown applies to the full queried host. */
export function classify(slots: Interval[], result: ReadResult): Slot[] {
  return slots.map((slot) => ({
    ...slot,
    state: result.errors.length
      ? "unknown"
      : result.busy.some(
            (busy) =>
              Date.parse(busy.start) < Date.parse(slot.end) &&
              Date.parse(busy.end) > Date.parse(slot.start),
          )
        ? "busy"
        : "free",
  }));
}
/** Independent reference feasibility oracle over truth, never adapter output. */
export function truthOffers(slots: Interval[], truth: Truth): string[] {
  if (truth.unknown.length) return [];
  return slots
    .filter((slot) =>
      truth.busy.every(
        (blocked) =>
          Math.max(Date.parse(slot.start), Date.parse(blocked.start)) >=
          Math.min(Date.parse(slot.end), Date.parse(blocked.end)),
      ),
    )
    .map((slot) => slot.start);
}
