import "@gouvfr/dsfr/dist/dsfr.css";
import "../../../../../app.css";
import { afterEach, expect, test } from "vitest";
import { cleanup, render } from "@testing-library/svelte";
import { page } from "vitest/browser";
import PhaseTimeline from "./PhaseTimeline.svelte";

afterEach(async () => {
  cleanup();
  await page.viewport(1280, 720);
});

test.each([320, 768, 1024, 1440])(
  "timeline marker spacing and connectors are even at %ipx",
  async (width) => {
    await page.viewport(width, 900);
    const { container } = render(PhaseTimeline, {
      props: { events: [], depotDate: new Date("2026-05-26") },
    });
    container.className = "pitchou-container";
    const timeline = container.querySelector("ol")!;
    const items = [...timeline.children] as HTMLElement[];
    const columns = width >= 1024 ? 6 : width >= 640 ? 3 : 2;
    const bounds = timeline.getBoundingClientRect();
    const spacing = (bounds.width - 24) / (columns - 1);
    const markers = items.map((item) =>
      item.querySelector<HTMLElement>(":scope > .z-10")!.getBoundingClientRect(),
    );
    for (let index = 0; index < markers.length; index++) {
      const marker = markers[index];
      const column = index % columns;
      expect(marker.width).toBe(24);
      expect(marker.left + 12).toBeCloseTo(bounds.left + 12 + column * spacing, 1);
      const connector = items[index].querySelector<HTMLElement>(".connector");
      if (column === 0) {
        if (connector) expect(getComputedStyle(connector).display).toBe("none");
      } else {
        const line = connector!.getBoundingClientRect();
        expect(line.left).toBeCloseTo(markers[index - 1].left + 12, 1);
        expect(line.right).toBeCloseTo(marker.left + 12, 1);
        expect(marker.top).toBe(markers[index - 1].top);
      }
    }
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width);
  },
);
