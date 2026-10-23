import { fetchAuthenticated } from "../helpers/auth.ts";
import { expect, test } from "vitest";
import { db } from "../setup/db.ts";
import { createInstructeurWithDossier } from "../factories/index.ts";
import { INTEGRATION_BASE_URL } from "../setup/integration-global.ts";

function metricsOf(personneId: number) {
  return db("evenement_metrique").where({ personne: personneId }).orderBy("id");
}

function post(path: string, cap: string, body: unknown) {
  return fetchAuthenticated(cap, `${INTEGRATION_BASE_URL}/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.each(["action_dossier", "evenement_metrique"])(
  "a %s failure rolls back comment creation",
  async (table) => {
    const author = await createInstructeurWithDossier(db);
    const metricsBefore = await metricsOf(author.id);
    await db.raw("ALTER TABLE ?? ADD CONSTRAINT reject_audit_test CHECK (false) NOT VALID", [
      table,
    ]);
    try {
      const response = await post(`dossier/${author.dossier.id}/commentaires`, author.cap, {
        content: "Must not survive a failed audit",
      });
      expect(response.status).toBe(500);
      expect(await db("commentaire").where({ dossier: author.dossier.id })).toEqual([]);
      expect(await db("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
      expect(await metricsOf(author.id)).toEqual(metricsBefore);
    } finally {
      await db.raw("ALTER TABLE ?? DROP CONSTRAINT reject_audit_test", [table]);
    }
  },
);

async function bulkFixture() {
  const author = await createInstructeurWithDossier(db);
  const metricsBefore = await metricsOf(author.id);
  const [decision] = await db("decision_administrative")
    .insert({ dossier: author.dossier.id, type: "Arrêté dérogation" })
    .returning("id");
  const prescriptions = [
    {
      decision_administrative: decision.id,
      article_number: "1",
      controles: [{ result: "Conforme" }],
    },
    {
      decision_administrative: decision.id,
      article_number: "2",
      controles: [{ result: "Non conforme" }],
    },
  ];
  return { author, decision, prescriptions, metricsBefore };
}

test("a failed controle insert rolls back the whole prescription batch without success audits", async () => {
  const { author, decision, prescriptions, metricsBefore } = await bulkFixture();
  const response = await post("prescriptions-et-controles", author.cap, [
    prescriptions[0],
    { ...prescriptions[1], controles: [{ controle_date: "invalid-date" }] },
  ]);
  expect(response.status).toBe(400);
  expect(await db("prescription").where({ decision_administrative: decision.id })).toEqual([]);
  expect(await db("controle")).toEqual([]);
  expect(await db("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
  expect(await metricsOf(author.id)).toEqual(metricsBefore);
});

test("an audit failure also rolls back successful bulk inserts", async () => {
  const { author, decision, prescriptions, metricsBefore } = await bulkFixture();
  await db.raw(
    "ALTER TABLE action_dossier ADD CONSTRAINT reject_audit_test CHECK (false) NOT VALID",
  );
  try {
    const response = await post("prescriptions-et-controles", author.cap, prescriptions);
    expect(response.status).toBe(400);
    expect(await db("prescription").where({ decision_administrative: decision.id })).toEqual([]);
    expect(await db("controle")).toEqual([]);
    expect(await db("action_dossier").where({ dossier: author.dossier.id })).toEqual([]);
    expect(await metricsOf(author.id)).toEqual(metricsBefore);
  } finally {
    await db.raw("ALTER TABLE action_dossier DROP CONSTRAINT reject_audit_test");
  }
});

test("a successful bulk insert records its prescriptions, controls, audits and metrics", async () => {
  const { author, decision, prescriptions, metricsBefore } = await bulkFixture();
  const response = await post("prescriptions-et-controles", author.cap, prescriptions);
  expect(response.status).toBe(204);
  expect(await db("prescription").where({ decision_administrative: decision.id })).toHaveLength(2);
  expect(await db("controle")).toHaveLength(2);
  const actions = await db("action_dossier").where({ dossier: author.dossier.id });
  expect(actions.map(({ type }) => type).sort()).toEqual([
    "controle_ajoute",
    "controle_ajoute",
    "prescription_ajoutee",
    "prescription_ajoutee",
  ]);
  expect(await metricsOf(author.id)).toHaveLength(metricsBefore.length + 4);
});
