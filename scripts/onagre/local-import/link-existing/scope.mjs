import {
  normalizeOnagreReference,
  onagreReferences,
} from "../../../../libs/server/src/onagre/reconciliation.ts";
import { reconciliationSource } from "../reconciliation.mjs";
import { assertScopedMilestone } from "./milestone.mjs";
import { assertDocumentedReferenceConflict } from "./reference-conflict.mjs";

/** Explicitly reviewed fallbacks never infer which sibling demande a DN record covers. */
export function assertReviewedScope(project, demande, current, evidence, decision) {
  const source = reconciliationSource(project);
  const scoped = decision.matchProfile === "scoped_milestone";
  if (
    (!scoped && (project.demandes.length !== 1 || source.demandes.length > 1)) ||
    (scoped &&
      source.demandes.some((s) => !project.demandes.some((d) => d.identity.sourceId === s.id))) ||
    (project.omittedDemandes ?? []).length > 0 ||
    !decision.targetEvidenceHash ||
    typeof decision.scopeReview !== "string" ||
    decision.scopeReview.trim().length < 80
  )
    throw new Error(
      "A single unambiguous source scope and explicit corroborated review are required",
    );

  if (decision.matchProfile === "documented_reference_conflict") {
    assertSharedLocation(demande.proposal.dossier, current);
    assertDocumentedReferenceConflict(demande, current, evidence, decision);
    return;
  }

  if (scoped) {
    const code = normalizeOnagreReference(source.projectCode);
    if (
      current.onagre_demande_identifier?.trim() &&
      (!code || normalizeOnagreReference(current.onagre_demande_identifier) !== code)
    )
      throw new Error("A scoped milestone requires an empty reference or the exact project code");
    assertScopedMilestone(project, demande, current, evidence, decision.scopeMilestone);
    assertSharedLocation(demande.proposal.dossier, current);
    return;
  }

  if (decision.matchProfile === "corroborated_text") {
    assertReviewedExcerpt(demande.proposal.dossier, current, decision.scopeExcerpt);
    return;
  }

  if (decision.matchProfile === "project_reference") {
    const code = normalizeOnagreReference(source.projectCode);
    if (!code || !onagreReferences(current.onagre_demande_identifier).has(code))
      throw new Error("The reviewed project reference must be present on the DN record");
    const codes = [...onagreReferences(current.onagre_demande_identifier)].filter((r) =>
      /^\d{4}(?:-[a-z0-9]+){2,5}$/u.test(r),
    );
    if (codes.some((r) => r !== code))
      throw new Error("Other references on this DN record require a separate scope review");
    return;
  }
  if (decision.matchProfile !== "corroborated_scope")
    throw new Error("Unknown reviewed match profile");
  if (current.onagre_demande_identifier?.trim())
    throw new Error("A conflicting or unresolved DN reference requires separate review");

  const fields = demande.proposal.dossier;
  assertSharedLocation(fields, current);
  assertOwnMilestone(demande, current, evidence);
}

function assertOwnMilestone(demande, current, evidence) {
  const fields = demande.proposal.dossier;
  const day = (value) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}/u.test(value) ? value.slice(0, 10) : null;
  const sourceDate = day(fields.ddep_depot_date ?? fields.depot_date);
  const targetDate = day(current.ddep_depot_date ?? current.depot_date);
  const sameDeposit = sourceDate && sourceDate === targetDate && sourceDate > "1900-01-01";
  const sameDecision = (demande.proposal.records ?? []).some(
    (r) =>
      r.table === "decision_administrative" &&
      day(r.values.signature_date) &&
      evidence.decision_administrative.some(
        (t) => day(t.signature_date) === day(r.values.signature_date),
      ),
  );
  const sameOpinion = (demande.proposal.records ?? []).some(
    (r) =>
      r.table === "avis_expert" &&
      r.values.expert &&
      day(r.values.avis_date) &&
      (evidence.avis_expert ?? []).some(
        (t) => t.expert === r.values.expert && day(t.avis_date) === day(r.values.avis_date),
      ),
  );
  if (!sameDeposit && !sameDecision && !sameOpinion)
    throw new Error(
      "A corroborated scope requires its own matching deposit, signature or expert opinion date",
    );
}

function assertReviewedExcerpt(fields, current, text) {
  assertSharedLocation(fields, current);
  if (
    current.onagre_demande_identifier?.trim() ||
    typeof text !== "string" ||
    text.trim().length < 200 ||
    new Set(text.split(/\s+/u)).size < 30 ||
    !fields.description?.includes(text) ||
    !current.description?.includes(text)
  )
    throw new Error("An exact, substantial source and DN description excerpt is required");
}

function assertSharedLocation(fields, current) {
  const sharedCommune = (fields.communes ?? []).some((s) =>
    (current.communes ?? []).some((t) => s.code && s.code === t.code),
  );
  const sharedDepartment = (fields.departments ?? []).some((d) =>
    [...(current.departments ?? []), current.primary_department].includes(d),
  );
  if (!sharedCommune && !sharedDepartment)
    throw new Error("A corroborated scope requires a shared source location");
}
