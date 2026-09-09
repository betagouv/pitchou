import { expect, test } from "vitest";
import { aggregateNotification } from "./aggregate.ts";
import type ActionDossier from "@pitchou/types/database/public/ActionDossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";

const dossier = 1 as DossierId;
const arrival = new Date("2026-09-01T12:00:00Z");
const detected = new Date("2026-09-03T12:00:00Z");
const row = { arrival_viewed: false, follow_revision: null, follow_at: null, viewed_at: null };
const action = (id = "revision-1", data = { field: "Description", notification: true }) =>
  ({
    id,
    dossier,
    type: "champ_modifie",
    author_petitionnaire: true,
    data,
    created_at: detected,
  }) as ActionDossier;

test("an arrival is unread without a follower or a personal notification row", () => {
  expect(aggregateNotification(dossier, undefined, arrival, [])).toMatchObject({
    viewed: false,
    new_arrival: { detected_at: arrival },
  });
});

test("old dossiers have no arrival and legacy broad dates do not create modifications", () => {
  expect(aggregateNotification(dossier, row, undefined, [])).toMatchObject({
    viewed: true,
    updated_at: null,
    new_arrival: null,
    new_follow: null,
  });
});

test("arrival dismissal affects only its personal state, not follow or modifications", () => {
  const state = {
    ...row,
    arrival_viewed: true,
    viewed_at: new Date(),
    follow_revision: "follow-2",
    follow_at: arrival,
  };
  const result = aggregateNotification(dossier, state, arrival, [action()]);
  expect(result).toMatchObject({
    viewed: false,
    new_arrival: null,
    new_follow: { revision: "follow-2" },
  });
  expect(result.changes).toHaveLength(1);
  expect(result.updated_at).toEqual(detected);
  expect(aggregateNotification(dossier, undefined, arrival, []).new_arrival).not.toBeNull();
});

test("reading a dossier does not acknowledge its fields", () => {
  const result = aggregateNotification(
    dossier,
    { ...row, arrival_viewed: true, viewed_at: new Date("2026-10-01") },
    arrival,
    [action()],
  );
  expect(result.viewed).toBe(false);
  expect(result.changes[0].modified_at).toBeNull();
});

test("one field groups exact revisions, and a later edit remains after an earlier acknowledgment", () => {
  const newer = { ...action("revision-2"), created_at: new Date("2026-09-04") };
  const grouped = aggregateNotification(dossier, row, undefined, [newer, action()]);
  expect(grouped.changes[0].revisions).toEqual(["revision-2", "revision-1"]);
  expect(grouped.changes[0].detected_at).toEqual(newer.created_at);
  const reviewed = new Set(["revision-1"]);
  const result = aggregateNotification(
    dossier,
    row,
    undefined,
    [action(), newer].filter(({ id }) => !reviewed.has(id)),
  );
  expect(result.changes[0].revisions).toEqual(["revision-2"]);
  expect(result.viewed).toBe(false);
});

test("initial submissions and instructor actions never become field notifications", () => {
  const baseline = { ...action(), data: { field: "piece:one", baseline: true } };
  const instructor = { ...action(), author_petitionnaire: false };
  const historic = { ...action(), data: { field: "Description" } };
  expect(
    aggregateNotification(dossier, row, undefined, [baseline, instructor, historic]).changes,
  ).toEqual([]);
});

test("the aggregate becomes read only when no yellow notification remains", () => {
  expect(aggregateNotification(dossier, { ...row, arrival_viewed: true }, arrival, []).viewed).toBe(
    true,
  );
  expect(
    aggregateNotification(
      dossier,
      { ...row, arrival_viewed: true, follow_revision: "refollow", follow_at: detected },
      arrival,
      [],
    ).viewed,
  ).toBe(false);
});

test("files with the same name remain independent revisions with readable history labels", () => {
  const files = ["one", "two"].map((id) => ({
    ...action(id),
    data: {
      field: "plan.pdf",
      notification_field: `piece:${id}`,
      notification: true,
    },
  }));
  const result = aggregateNotification(dossier, row, undefined, files);
  expect(result.changes.map(({ field }) => field)).toEqual(["piece:one", "piece:two"]);
  expect(result.changes.map(({ label }) => label)).toEqual(["plan.pdf", "plan.pdf"]);
});

test("the sorting timestamp survives the last acknowledgment without creating a modified badge", () => {
  const lastDetectedAt = new Date("2026-09-05");
  expect(aggregateNotification(dossier, row, undefined, [], lastDetectedAt)).toMatchObject({
    viewed: true,
    changes: [],
    updated_at: lastDetectedAt,
  });
  const pending = aggregateNotification(dossier, row, undefined, [action()], lastDetectedAt);
  expect(pending.updated_at).toEqual(lastDetectedAt);
  expect(pending.changes[0].detected_at).toEqual(detected);
});
