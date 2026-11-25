import { expect, test } from "vitest";
import { calculateIndicatorAcquis } from "@pitchou/server/database/aarri/acquis.ts";
import { calculateProxyIndicators } from "@pitchou/server/database/aarri/proxy.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

const weeks = ["2026-06-01", "2026-06-08", "2026-06-29", "2026-07-06"].map((week) =>
  new Date(`${week}T00:00:00`).toISOString(),
);
const observedAt = new Date("2026-07-06T12:00:00Z");

async function addEvents(
  email: string | null,
  events: [EvenementMetrique["type"], string, count?: number][],
): Promise<void> {
  const [{ id }] = await db("auth_user").insert({ email }).returning("id");
  await db("evenement_metrique").insert(
    events.flatMap(([evenement, date, count = 1]) =>
      Array.from({ length: count }, () => ({ personne: id, evenement, date })),
    ),
  );
}

test("proxy-impact counts the first recorded controle for each eligible person", async () => {
  await addEvents("author@example.fr", [
    ["ajouterContrôle", "2026-06-08T00:00:00Z"],
    ["ajouterContrôle", "2026-06-08T12:00:00Z"],
  ]);
  await addEvents("second-author@example.fr", [["ajouterContrôle", "2026-06-30T12:00:00Z"]]);
  await addEvents("earlier-author@example.fr", [["ajouterContrôle", "2026-03-01T12:00:00Z"]]);
  await addEvents("edited-only@example.fr", [
    ["modifierContrôle", "2026-06-01T12:00:00Z"],
    ["retourÀLaConformité", "2026-06-01T12:00:00Z"],
  ]);
  await addEvents("team@beta.gouv.fr", [["ajouterContrôle", "2026-06-01T12:00:00Z"]]);
  await addEvents("future@example.fr", [["ajouterContrôle", "2026-07-06T12:00:00.001Z"]]);

  const indicators = await calculateProxyIndicators(weeks, observedAt, db);
  expect(weeks.map((week) => indicators.get(week)?.proxyImpact)).toEqual([1, 2, 3, 3]);
});

test("proxy-retention applies the rolling 30-day window and can decrease", async () => {
  for (const email of ["first@example.fr", "second@example.fr"]) {
    await addEvents(email, [
      ["modifierPrescription", "2026-06-06T11:59:59.999Z"],
      ["modifierPrescription", "2026-06-25T12:00:00Z", 4],
    ]);
  }
  await addEvents("exact-boundary@example.fr", [
    ["ajouterContrôle", "2026-06-06T12:00:00Z"],
    ["modifierPrescription", "2026-06-25T12:00:00Z", 3],
    ["modifierPrescription", "2026-07-06T12:00:00Z"],
  ]);
  await addEvents("consultation@example.fr", [
    ["modifierPrescription", "2026-06-25T12:00:00Z", 4],
    ["consulterUnDossier", "2026-06-25T12:00:00Z", 10],
  ]);
  await addEvents("team@beta.gouv.fr", [["modifierPrescription", "2026-06-25T12:00:00Z", 10]]);

  const indicators = await calculateProxyIndicators(weeks, observedAt, db);
  expect(weeks.map((week) => indicators.get(week)?.proxyRetention)).toEqual([0, 0, 2, 1]);
});

test("proxy indicators are zero for an observed week without modification events", async () => {
  const indicators = await calculateProxyIndicators([weeks[0]], observedAt, db);
  expect(indicators.get(weeks[0])).toEqual({ proxyImpact: 0, proxyRetention: 0 });
});

test("proxy-retention uses 30 elapsed days across a daylight saving change", async () => {
  await addEvents("author@example.fr", [
    ["modifierPrescription", "2026-02-28T12:30:00Z"],
    ["modifierPrescription", "2026-03-29T12:00:00Z", 4],
  ]);
  const week = new Date("2026-03-30T00:00:00").toISOString();
  const observedAt = new Date("2026-03-30T12:00:00Z");
  await db.transaction(async (trx) => {
    await trx.raw("set local time zone 'Europe/Paris'");
    const indicators = await calculateProxyIndicators([week], observedAt, trx);
    expect(indicators.get(week)?.proxyRetention).toBe(1);
  });
});

test("both calculations use the same week when the observation crosses Monday midnight", async () => {
  await addEvents("author@example.fr", [
    ["seConnecter", "2026-07-06T00:00:01Z"],
    ["ajouterContrôle", "2026-07-06T00:00:01Z"],
  ]);
  const sunday = new Date("2026-07-05T23:59:59Z");
  const monday = new Date("2026-07-06T00:00:02Z");
  const mondayWeek = weeks[3];
  const before = await calculateIndicatorAcquis(2, sunday, db);
  const after = await calculateIndicatorAcquis(2, monday, db);
  expect([...before.keys()]).not.toContain(mondayWeek);
  expect([...after.keys()]).toContain(mondayWeek);
  const indicators = await calculateProxyIndicators([...after.keys()], monday, db);
  expect(indicators.get(mondayWeek)?.proxyImpact).toBe(1);
});

test("the AARRI API includes both proxy counts for the current week", async () => {
  const date = new Date(Date.now() - 1000).toISOString();
  for (const email of ["author@example.fr", null]) {
    await addEvents(email, [
      ["ajouterContrôle", date],
      ["modifierPrescription", date, 4],
    ]);
  }

  const response = await fetch(`${INTEGRATION_BASE_URL}/api/aarri`);
  expect(response.status).toBe(200);
  const [latest] = await response.json();
  expect(latest).toMatchObject({
    nombreUtilisateuriceProxyImpact: 2,
    nombreUtilisateuriceProxyRetenu: 2,
  });
});
