import { createHash } from "node:crypto";
import {
  hasReviewedLocation,
  reviewedLocation,
} from "../../../libs/common/src/onagre/reviewedLocations.ts";
import { prepareDemandeLabel } from "./projects.mjs";

export function prepareReviewedLocation(sample) {
  if (!hasReviewedLocation(sample.identity.key)) return sample;
  const fields = sample.proposal.dossier;
  const rowsHash = createHash("sha256").update(JSON.stringify(sample.source.rows)).digest("hex");
  const locationCorrection = reviewedLocation({
    key: sample.identity.key,
    projectId: sample.identity.projetId,
    reference: fields.onagre_demande_identifier,
    deposit: fields.ddep_depot_date,
    departments: fields.departments ?? [],
    signatures: sample.proposal.records
      .filter((record) => record.table === "decision_administrative")
      .map((record) => record.values.signature_date)
      .filter(Boolean),
    sourceHash: rowsHash,
    sourceKind: "rows",
  });
  if (!locationCorrection || rowsHash !== sample.source.rowsSha256)
    throw new Error(`Reviewed location snapshot changed: ${sample.identity.key}`);
  const prepared = {
    ...sample,
    locationCorrection,
    proposal: {
      ...sample.proposal,
      dossier: { ...fields, departments: [...locationCorrection.departments] },
    },
  };
  prepared.label = prepareDemandeLabel(prepared);
  return prepared;
}
