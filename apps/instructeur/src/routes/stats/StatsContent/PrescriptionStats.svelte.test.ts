import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import PrescriptionStats from "./PrescriptionStats.svelte";
import type { PublicStats } from "@pitchou/types/API_Pitchou.ts";

afterEach(cleanup);

test("displays empty controlled and uncontrolled shares as 0%", () => {
  const stats = {
    controllablePrescriptionCount: 0,
    prescriptionWithControleCount: 0,
  } as PublicStats;
  const { container } = render(PrescriptionStats, { stats });
  const labels = Array.from(container.querySelectorAll("span"), ({ textContent }) =>
    textContent?.replace(/\s+/g, " ").trim(),
  );
  const chartWidths = Array.from(
    container.querySelectorAll<HTMLElement>(".fr-progress-bar > div"),
    ({ style }) => style.width,
  );

  expect(labels).toContain("Contrôlées dans Pitchou0%");
  expect(labels).toContain("Non contrôlées dans Pitchou0%");
  expect(chartWidths).toEqual(["0%", "0%"]);
});
