import test from "node:test";
import assert from "node:assert/strict";
import { assertReviewedScope } from "./scope.mjs";

function fixture() {
  const demande = {
    identity: { sourceTable: "demandes", sourceId: "2" },
    proposal: {
      dossier: {
        depot_date: "2025-01-01",
        departments: ["33"],
        onagre_demande_identifier: "2025-00001-011-001",
      },
      records: [],
    },
    source: { rows: { projet: [{ projetid: "1", codeprojet: "2025-01-13d-00001" }] } },
  };
  return {
    project: {
      identity: { sourceId: "1" },
      proposal: { name: "Unique source project" },
      demandes: [demande],
    },
    demande,
    current: {
      depot_date: "2025-01-01T12:00:00+00:00",
      departments: ["33"],
      onagre_demande_identifier: null,
    },
    evidence: { decision_administrative: [] },
    decision: {
      matchProfile: "corroborated_scope",
      targetEvidenceHash: "checked-by-caller",
      scopeReview:
        "The complete source scope has been explicitly compared with this DN record, including its location and own milestone. No sibling or other candidate was selected.",
    },
  };
}
const verify = (f) => assertReviewedScope(f.project, f.demande, f.current, f.evidence, f.decision);
test("a reviewed comment milestone keeps the exact date and its role", () => {
  const f = fixture();
  f.demande.identity.key = "onagre-national:demandes:2";
  f.decision.matchProfile = "scoped_milestone";
  f.current.depot_date = "2024-12-15";
  f.current.free_comment = "01/01/25 : Dépôt du dossier DEP pour saisine CNPN";
  f.decision.scopeMilestone = {
    kind: "deposit",
    date: "2025-01-01",
    targetQuote: f.current.free_comment,
  };
  assert.doesNotThrow(() => verify(f));
  f.current.free_comment = "01/01/24 : Dépôt du dossier DEP pour saisine CNPN";
  assert.throws(() => verify(f), /quoted DN milestone/u);
  f.decision.scopeMilestone.targetQuote = f.current.free_comment;
  assert.throws(() => verify(f), /quoted DN milestone/u);
  f.current.free_comment = "01/01/25 : Réunion préalable pour préparer la saisine CNPN";
  f.decision.scopeMilestone.targetQuote = f.current.free_comment;
  assert.throws(() => verify(f), /quoted DN milestone/u);
});
test("a reviewed description excerpt cannot select siblings or match short generic text", () => {
  const f = fixture();
  f.decision.matchProfile = "corroborated_text";
  f.current.depot_date = "2026-01-01";
  const text =
    "The proposed experiment concerns nocturnal light deterrence around a fish pond at a specifically named agricultural school, supported by a regional research grant for the period 2025 to 2027. It studies otter predation using randomly flashing lights and compares the observations with an untreated reference area.";
  f.demande.proposal.dossier.description = text;
  f.current.description = "Additional context. " + text;
  f.decision.scopeExcerpt = text;
  assert.doesNotThrow(() => verify(f));
  f.current.description = text.replace("otter", "bird");
  assert.throws(() => verify(f), /substantial source and DN/u);
  f.current.description = text;
  f.decision.scopeExcerpt = "The proposed experiment";
  assert.throws(() => verify(f), /substantial source and DN/u);
  f.decision.scopeExcerpt = text;
  f.project.omittedDemandes = [{ id: "3" }];
  assert.throws(() => verify(f), /single unambiguous/u);
});
test("corroborated scopes require an own milestone, shared location and no conflicting reference", () => {
  const f = fixture();
  assert.doesNotThrow(() => verify(f));
  f.current.depot_date = "2026-01-01";
  assert.throws(() => verify(f), /own matching deposit, signature or expert opinion/u);
  f.demande.proposal.records = [
    { table: "decision_administrative", values: { signature_date: "2025-07-01" } },
  ];
  f.evidence.decision_administrative = [{ signature_date: "2025-07-01" }];
  assert.doesNotThrow(() => verify(f));
  f.current.departments = ["40"];
  assert.throws(() => verify(f), /shared source location/u);
  f.current.departments = ["33"];
  f.current.onagre_demande_identifier = "2025-00999-011-001";
  assert.throws(() => verify(f), /conflicting or unresolved/u);
});
test("an expert opinion must belong to this demande and match both expert and date", () => {
  const f = fixture();
  f.current.depot_date = "2026-01-01";
  f.demande.proposal.records = [
    { table: "avis_expert", values: { expert: "CNPN", avis_date: "2025-06-20" } },
  ];
  f.evidence.avis_expert = [{ expert: "CSRPN", avis_date: "2025-06-20" }];
  assert.throws(() => verify(f), /own matching/u);
  f.evidence.avis_expert[0].expert = "CNPN";
  assert.doesNotThrow(() => verify(f));
  f.evidence.avis_expert[0].avis_date = "2025-06-21";
  assert.throws(() => verify(f), /own matching/u);
});
test("project references cannot choose among siblings or ignore another code", () => {
  const f = fixture();
  f.decision.matchProfile = "project_reference";
  f.current.onagre_demande_identifier = "Projet : 2025-01-13d-00001";
  assert.doesNotThrow(() => verify(f));
  f.current.onagre_demande_identifier += " / 2025-00999-011-001";
  assert.throws(() => verify(f), /Other references/u);
  f.current.onagre_demande_identifier = "2025-01-13d-00001";
  f.demande.source.relatedDemandes = [{ id: "3", code: "2025-00001-011-002" }];
  assert.throws(() => verify(f), /single unambiguous/u);
  delete f.demande.source.relatedDemandes;
  f.project.omittedDemandes = [{ id: "3" }];
  assert.throws(() => verify(f), /single unambiguous/u);
});

test("a reviewed scoped milestone must distinguish the selected demande from every sibling", () => {
  const f = fixture();
  f.demande.identity.key = "onagre-national:demandes:2";
  const sibling = structuredClone(f.demande);
  sibling.identity = { ...sibling.identity, sourceId: "3", key: "onagre-national:demandes:3" };
  sibling.proposal.dossier.depot_date = "2024-01-01";
  sibling.proposal.dossier.onagre_demande_identifier = "2025-00001-011-002";
  f.project.demandes.push(sibling);
  f.decision.matchProfile = "scoped_milestone";
  f.decision.scopeMilestone = { kind: "deposit", date: "2025-01-01" };
  assert.doesNotThrow(() => verify(f));
  sibling.proposal.dossier.depot_date = "2025-01-01";
  assert.throws(() => verify(f), /exactly this source demande/u);
  sibling.proposal.dossier.depot_date = "2024-01-01";
  f.current.depot_date = "2024-01-01";
  assert.throws(() => verify(f), /present in the DN record/u);
  f.current.depot_date = "2025-01-01";
  f.demande.source.relatedDemandes = [{ id: "4", code: "2025-00001-011-003" }];
  assert.throws(() => verify(f), /unambiguous source scope/u);
  delete f.demande.source.relatedDemandes;
  f.decision.scopeMilestone = { kind: "opinion", date: "2025-06-20", expert: "CNPN" };
  f.demande.proposal.records = [
    { table: "avis_expert", values: { expert: "CNPN", avis_date: "2025-06-20" } },
  ];
  f.evidence.avis_expert = [{ expert: "CSRPN", avis_date: "2025-06-20" }];
  assert.throws(() => verify(f), /present in the DN record/u);
  f.evidence.avis_expert[0].expert = "CNPN";
  assert.doesNotThrow(() => verify(f));
});
