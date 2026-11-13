import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
test("one command emits deterministic report, timeline and exact headline", () => {
  const directory = mkdtempSync(join(tmpdir(), "calendar-cli-"));
  try {
    const run = () =>
      execFileSync(process.execPath, ["--import", "tsx", "src/cli.ts", "--out", directory], {
        encoding: "utf8",
      });
    expect(run()).toContain("Unsafe slots: baseline 235/255 -> proposed 0/255");
    const first = readFileSync(join(directory, "report.json"), "utf8");
    expect(JSON.parse(first).rows).toHaveLength(50);
    expect(readFileSync(join(directory, "timeline.html"), "utf8")).toContain(
      "Proposed fail-closed",
    );
    run();
    expect(readFileSync(join(directory, "report.json"), "utf8")).toBe(first);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
test("invalid CLI flags fail rather than imply a live test", () => {
  expect(() =>
    execFileSync(process.execPath, ["--import", "tsx", "src/cli.ts", "--live"], { stdio: "pipe" }),
  ).toThrow();
});
