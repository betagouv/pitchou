import { expect, test } from "vitest";
import { createPageViewTracker } from "./tracking.ts";

test("queues page views without secrets and ignores the cleanup redirect", () => {
  const track = createPageViewTracker();
  const queue: unknown[][] = [];
  const original = new URL("https://pitchou.test/dossiers?secret=private&tab=suivis");
  track(queue, original, "Mes dossiers");
  track(queue, new URL("https://pitchou.test/dossiers?tab=suivis"), "Mes dossiers");
  expect(queue).toEqual([
    ["setCustomUrl", "https://pitchou.test/dossiers?tab=suivis"],
    ["setDocumentTitle", "Mes dossiers"],
    ["trackPageView"],
  ]);
  expect(original.searchParams.get("secret")).toBe("private");
});

test("preserves command order and referrers when Matomo replaces the initial queue", () => {
  const track = createPageViewTracker();
  const queue: unknown[][] = [];
  track(queue, new URL("https://pitchou.test/first?secret=private"), "First");
  const processed = [...queue];
  // Loaded Matomo processes all command arguments immediately.
  const tracker = { push: (...commands: unknown[][]) => processed.push(...commands) };
  track(tracker, new URL("https://pitchou.test/second"), "Second");
  track(tracker, new URL("https://pitchou.test/second"), "Second");
  expect(processed).toEqual([
    ["setCustomUrl", "https://pitchou.test/first"],
    ["setDocumentTitle", "First"],
    ["trackPageView"],
    ["setReferrerUrl", "https://pitchou.test/first"],
    ["setCustomUrl", "https://pitchou.test/second"],
    ["setDocumentTitle", "Second"],
    ["trackPageView"],
  ]);
});
