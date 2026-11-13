import { expect, test } from "vitest";
import { renderTimeline } from "../src/timeline.js";
import { runLab } from "../src/lab.js";
test("timeline exposes both policies, all fixtures and a healthy independent host", async () => {
  const html = renderTimeline(await runLab());
  expect(html).toContain("unknown — cannot offer");
  expect(html).toContain("Healthy independent host");
  expect(html).toContain('data-policy="baseline"');
  expect((html.match(/data-case=/g) ?? []).length).toBe(50);
  expect(html).toContain("235 / 255");
});
test("fixture text is escaped, never executable markup", async () => {
  const report = await runLab();
  report.rows[1]!.id = "<img src=x onerror=alert(1)>";
  const html = renderTimeline(report);
  expect(html).not.toContain("<img");
  expect(html).toContain("&lt;img");
});
