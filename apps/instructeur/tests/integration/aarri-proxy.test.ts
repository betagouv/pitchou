import { expect, test } from "vitest";
import { calculateProxyIndicators } from "@pitchou/server/database/aarri/proxy.ts";
import type { EvenementMetrique } from "@pitchou/types/evenement.d.ts";
import { db } from "../setup/db.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

const weeks = ["2026-06-01", "2026-06-08", "2026-06-29", "2026-07-06"].map((week) =>
  new Date(`${week}T00:00:00`).toISOString(),
);
const observedAt = new Date("2026-07-06T12:00:00Z");

async function addEvents(
  email: string,
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
  await addEvents("edited-only@example.fr", [
    ["modifierContrôle", "2026-06-01T12:00:00Z"],
    ["retourÀLaConformité", "2026-06-01T12:00:00Z"],
  ]);
  await addEvents("team@beta.gouv.fr", [["ajouterContrôle", "2026-06-01T12:00:00Z"]]);
  await addEvents("future@example.fr", [["ajouterContrôle", "2026-07-06T12:00:00.001Z"]]);

  const indicators = await calculateProxyIndicators(weeks, observedAt, db);
  expect(weeks.map((week) => indicators.get(week)?.proxyImpact)).toEqual([0, 1, 2, 2]);
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

test("the AARRI API includes both proxy counts for the current week", async () => {
  const date = new Date(Date.now() - 1000).toISOString();
  await addEvents("author@example.fr", [
    ["ajouterContrôle", date],
    ["modifierPrescription", date, 4],
  ]);

  const response = await fetch(`${INTEGRATION_BASE_URL}/api/aarri`);
  expect(response.status).toBe(200);
  const [latest] = await response.json();
  expect(latest).toMatchObject({
    nombreUtilisateuriceProxyImpact: 1,
    nombreUtilisateuriceProxyRetenu: 1,
  });
});
