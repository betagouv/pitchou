import { expect, test } from "vitest";
import { historiqueEntries } from "./display.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { DossierAction } from "@pitchou/types/capabilities.ts";

type PhaseEvent = DossierFull["evenementsPhase"][number];

function event(timestamp: string, overrides: Partial<PhaseEvent> = {}): PhaseEvent {
  return {
    dossier: 123 as DossierFull["id"],
    phase: "Instruction",
    timestamp: new Date(timestamp),
    caused_by_personne: 42 as PhaseEvent["caused_by_personne"],
    demarche_numerique_agent_email: null,
    demarche_numerique_motivation: null,
    ...overrides,
  };
}

function action(created_at: string, overrides: Partial<DossierAction> = {}): DossierAction {
  return {
    id: created_at,
    type: "phase_renseignee",
    data: { dossier: 123, value: "Instruction", timestamp: "2026-09-02T10:00:00.000Z" },
    created_at,
    author_email: "claire.morin@example.com",
    author_petitionnaire: false,
    ...overrides,
  };
}

function entries(events: PhaseEvent[], actions: DossierAction[] = []) {
  return historiqueEntries(actions, {
    evenementsPhase: events,
    depot_date: new Date("2025-01-01"),
    source: "pitchou",
  } as DossierFull);
}

test("preserves legacy, synced and admin phase events in date order without actions", () => {
  const history = entries([
    event("2025-02-01", { phase: "Étude recevabilité", caused_by_personne: null }),
    event("2026-08-01T10:00:00Z", {
      caused_by_personne: null,
      demarche_numerique_agent_email: "agent@example.com",
      demarche_numerique_motivation: "Dossier recevable",
    }),
    event("2026-09-02T11:00:00Z", { phase: "Classé sans suite" }),
  ]);
  expect(history.map(({ value }) => value)).toEqual([
    "Classé sans suite",
    "Instruction",
    "Étude recevabilité",
    undefined,
  ]);
  expect(history[0]).toMatchObject({ date: new Date("2026-09-02T11:00:00Z"), timeKnown: true });
  expect(history[1]).toMatchObject({ author: "par agent", tone: "instructeur" });
  expect(history[2]).toMatchObject({ timeKnown: false, tone: "system" });
  expect(new Set(history.map(({ id }) => id)).size).toBe(history.length);
});

test.each(["2026-09-03T10:00:02.123Z", "2026-09-01T09:59:59.800Z"])(
  "uses exact identity, not action time %s, and keeps the event date and action attribution",
  (createdAt) => {
    const history = entries([event("2026-09-02T10:00:00Z")], [action(createdAt)]);
    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      id: "phase-123-Instruction-2026-09-02T10:00:00.000Z",
      date: new Date("2026-09-02T10:00:00Z"),
      author: "par claire.morin",
    });
  },
);

test("preserves same-phase admin and synced events even closer to the action creation time", () => {
  const history = entries(
    [
      event("2026-09-02T09:59:40Z"),
      event("2026-09-02T10:00:00Z"),
      event("2026-09-02T10:00:02Z", { caused_by_personne: 7 as PhaseEvent["caused_by_personne"] }),
      event("2026-09-02T10:00:01Z", {
        caused_by_personne: null,
        demarche_numerique_agent_email: "agent@example.com",
      }),
      event("2026-09-01T10:00:00Z"),
    ],
    [action("2026-09-02T10:00:02Z")],
  );
  expect(history.map(({ date }) => date.toISOString())).toEqual([
    "2026-09-02T10:00:02.000Z",
    "2026-09-02T10:00:01.000Z",
    "2026-09-02T10:00:00.000Z",
    "2026-09-02T09:59:40.000Z",
    "2026-09-01T10:00:00.000Z",
    "2025-01-01T00:00:00.000Z",
  ]);
  expect(history[0].author).toBeUndefined();
  expect(history[1].author).toBe("par agent");
  expect(history[2].author).toBe("par claire.morin");
});

test("does not merge different phases, unrelated actions or distant same-day events", () => {
  const history = entries(
    [event("2026-09-02T08:00:00Z"), event("2026-09-02T10:00:00Z", { phase: "Contrôle" })],
    [action("2026-09-02T10:00:00Z"), action("2026-09-02T08:00:00Z", { type: "champ_modifie" })],
  );
  expect(history).toHaveLength(4);
  expect(
    history.filter(({ label }) => label === "Phase renseignée :").every(({ author }) => !author),
  ).toBe(true);
});

test.each([
  { dossier: 456, value: "Instruction", timestamp: "2026-09-02T10:00:00.000Z" },
  { dossier: 123, value: "Contrôle", timestamp: "2026-09-02T10:00:00.000Z" },
  { dossier: 123, value: "Instruction", timestamp: "2026-09-02T10:00:01.000Z" },
  { value: "Instruction" },
])("ignores unlinked phase action metadata %j without hiding the canonical event", (data) => {
  const history = entries(
    [event("2026-09-02T10:00:00Z")],
    [action("2026-09-02T10:00:00Z", { data })],
  );
  expect(history).toHaveLength(2);
  expect(history[0]).toMatchObject({ value: "Instruction", author: undefined });
});

test("phase actions never create history rows without canonical events", () => {
  expect(entries([], [action("2026-09-02T10:00:00Z")])).toHaveLength(1);
});

test("matches an optimistic event using database timestamp precision and a stable ID", () => {
  const actions = [
    action("2026-09-03T10:00:00Z", {
      data: { dossier: 123, value: "Instruction", timestamp: "2026-09-02T10:00:01.000Z" },
    }),
  ];
  const optimistic = entries([event("2026-09-02T10:00:00.800Z")], actions)[0];
  const persisted = entries([event("2026-09-02T10:00:01Z")], actions)[0];
  expect(optimistic.author).toBe("par claire.morin");
  expect(persisted.author).toBe(optimistic.author);
  expect(persisted.id).toBe(optimistic.id);
});

test("accepts serialized phase timestamps and does not mutate inputs", () => {
  const events = Object.freeze([
    Object.freeze(event("2026-09-01T10:00:00Z")),
    Object.freeze({ ...event("2026-09-02T10:00:00Z"), timestamp: "2026-09-02T12:00:00+02:00" }),
  ]) as unknown as PhaseEvent[];
  const actions = Object.freeze([Object.freeze(action("2026-09-02T10:00:01Z"))]) as DossierAction[];
  expect(entries(events, actions)).toHaveLength(3);
  expect(events[0].timestamp).toEqual(new Date("2026-09-01T10:00:00Z"));
});
