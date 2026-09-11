import { describe, expect, it } from "vitest";
import { prochaineActionAttenduePar } from "@pitchou/common/phases.ts";
import { actionsFromDossierUpdate } from "./updateActions.ts";
import { parseDossierUpdate } from "./updatePayload.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

const dossierId = 42 as DossierId;
const authorId = 7 as PersonneId;

describe("phase event identity", () => {
  it.each([
    ["2026-09-02T10:00:00.499Z", "2026-09-02T10:00:00.000Z"],
    ["2026-09-02T12:00:00.500+02:00", "2026-09-02T10:00:01.000Z"],
    ["2026-09-02T23:59:59.999Z", "2026-09-03T00:00:00.000Z"],
    ["1999-12-31T23:59:59.500Z", "1999-12-31T23:59:59.000Z"],
    ["1999-12-31T23:59:59.501Z", "2000-01-01T00:00:00.000Z"],
  ])("records the database identity for timestamp %s", (timestamp, storedTimestamp) => {
    const update = parseDossierUpdate(
      {
        evenementsPhase: [{ dossier: dossierId, phase: "Instruction", timestamp }],
      },
      dossierId,
    );
    expect(actionsFromDossierUpdate(update, dossierId, authorId)).toEqual([
      {
        dossier: dossierId,
        author_personne: authorId,
        type: "phase_renseignee",
        data: { dossier: dossierId, value: "Instruction", timestamp: storedTimestamp },
      },
    ]);
  });

  it("records metadata for every phase event in a batch", () => {
    const update = parseDossierUpdate(
      {
        evenementsPhase: [
          { dossier: dossierId, phase: "Instruction", timestamp: "2026-09-01T10:00:00Z" },
          { dossier: dossierId, phase: "Contrôle", timestamp: "2026-09-02T10:00:00Z" },
        ],
      },
      dossierId,
    );
    expect(actionsFromDossierUpdate(update, dossierId, authorId).map(({ data }) => data)).toEqual([
      { dossier: dossierId, value: "Instruction", timestamp: "2026-09-01T10:00:00.000Z" },
      { dossier: dossierId, value: "Contrôle", timestamp: "2026-09-02T10:00:00.000Z" },
    ]);
  });
});

const before = {
  ddep_required: null,
  er_mesures_sufficient: null,
  public_consultation_start_date: null,
  public_consultation_end_date: null,
};

it.each([...prochaineActionAttenduePar, null])(
  "records only the entity action when assigning %s",
  (entity) => {
    const update = parseDossierUpdate({ next_action_expected_from: entity }, dossierId);
    expect(actionsFromDossierUpdate(update, dossierId, authorId, before)).toEqual([
      {
        dossier: dossierId,
        author_personne: authorId,
        type: "prochaine_action_renseignee",
        data: { value: entity },
      },
    ]);
  },
);

it("does not record an entity action on unrelated updates", () => {
  const actions = actionsFromDossierUpdate({ enjeu: true }, dossierId, authorId, before);
  expect(actions.map(({ type }) => type)).toEqual(["enjeu_renseigne"]);
  expect(actionsFromDossierUpdate({}, dossierId, authorId, before)).toEqual([]);
});
