import { describe, expect, it } from "vitest";
import { actionsFromDossierUpdate } from "./updateActions.ts";
import { parseDossierUpdate } from "./updatePayload.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { PersonneId } from "@pitchou/types/database/public/Personne.ts";

const dossierId = 42 as DossierId;
const authorId = 7 as PersonneId;
const before = {
  ddep_required: null,
  er_mesures_sufficient: null,
  public_consultation_start_date: null,
  public_consultation_end_date: null,
  next_action_expected: null,
};

describe("next-action clearing audit", () => {
  it("does not log an injected clear when the task was already null", () => {
    const update = parseDossierUpdate({ next_action_expected_from: "Instructeur" }, dossierId);
    expect(update.next_action_expected).toBeNull();
    expect(actionsFromDossierUpdate(update, dossierId, authorId, before)).toEqual([
      {
        dossier: dossierId,
        author_personne: authorId,
        type: "prochaine_action_renseignee",
        data: { value: "Instructeur" },
      },
    ]);
  });

  it("records clearing a stored task, but not a subsequent clear", () => {
    const update = parseDossierUpdate({ next_action_expected_from: "Instructeur" }, dossierId);
    const actions = actionsFromDossierUpdate(update, dossierId, authorId, {
      ...before,
      next_action_expected: "legacy task",
    });
    expect(actions.map(({ type }) => type)).toEqual([
      "prochaine_action_renseignee",
      "prochaine_action_attendue_renseignee",
    ]);
    expect(actions[1].data).toEqual({ value: null });
    expect(
      actionsFromDossierUpdate({ next_action_expected: null }, dossierId, authorId, before),
    ).toEqual([]);
  });

  it("does not clear or audit a task on unrelated updates", () => {
    const actions = actionsFromDossierUpdate({ enjeu: true }, dossierId, authorId, {
      ...before,
      next_action_expected: "legacy task",
    });
    expect(actions.map(({ type }) => type)).toEqual(["enjeu_renseigne"]);
  });
});
