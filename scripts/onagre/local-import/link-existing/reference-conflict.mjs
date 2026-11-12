import fs from "node:fs";
import { createHash } from "node:crypto";
import { reconciliationHash } from "../linked.mjs";
import { normalizeOnagreReference } from "../../../../libs/server/src/onagre/reconciliation.ts";

/** This records an explicit documentary review; it never corrects the stored DN code. */
export function assertDocumentedReferenceConflict(demande, current, evidence, decision) {
  const review = decision.referenceConflict;
  const sourceReference = demande.proposal.dossier.onagre_demande_identifier;
  if (
    !review ||
    review.sourceReference !== sourceReference ||
    review.storedReference !== current.onagre_demande_identifier ||
    !review.storedReference?.trim() ||
    normalizeOnagreReference(review.storedReference) ===
      normalizeOnagreReference(sourceReference) ||
    review.ownerDecision?.quote !==
      "Link the documented demande; preserve the DN code and audit trail" ||
    !review.ownerDecision.requestId ||
    typeof review.rejectedReferenceReview !== "string" ||
    review.rejectedReferenceReview.trim().length < 80 ||
    typeof review.targetTitleQuote !== "string" ||
    review.targetTitleQuote.length < 10 ||
    !current.name?.includes(review.targetTitleQuote)
  )
    throw new Error(
      "An explicit owner decision and exact conflicting reference review are required",
    );

  const files = decision.evidence?.fileMetadata?.files;
  if (
    !Array.isArray(files) ||
    !decision.targetFilesHash ||
    reconciliationHash(files) !== decision.targetFilesHash ||
    !files.some((file) => file.name === review.attachmentName)
  )
    throw new Error("The reviewed decree attachment metadata is required");
  assertOriginal(review.original);
  const date = review.original.signatureDate;
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(date ?? "") ||
    !demande.proposal.records.some(
      (r) => r.table === "decision_administrative" && r.values.signature_date === date,
    ) ||
    !evidence.decision_administrative.some((r) => r.signature_date === date)
  )
    throw new Error("The reviewed original signature must match this demande and DN decision");
}

function assertOriginal(original) {
  if (
    !original?.url?.startsWith("https://") ||
    !original.decreeNumber ||
    !Array.isArray(original.physicalPagesRead) ||
    original.physicalPagesRead.length === 0 ||
    original.physicalPagesRead.some((p) => !Number.isInteger(p) || p < 1) ||
    typeof original.clauseReview !== "string" ||
    original.clauseReview.trim().length < 80
  )
    throw new Error("A retained original, exact pages and explicit clause review are required");
  const bytes = fs.readFileSync(original.path);
  if (
    !bytes.subarray(0, 5).equals(Buffer.from("%PDF-")) ||
    createHash("sha256").update(bytes).digest("hex") !== original.sha256
  )
    throw new Error("The retained original changed since review");
}
