import { directDatabaseConnection as db } from "@pitchou/server/database.ts";
import type { RequestHandler } from "./$types";
import { listDocuments } from "@pitchou/server/onagre/documents.ts";
import { loadDuplicateWorkspace } from "@pitchou/server/onagre/duplicates.ts";
import { loadConfirmedDuplicates } from "@pitchou/server/onagre/confirmedDuplicates.ts";
export const GET: RequestHandler = async () => {
  const [
    mappings,
    revisions,
    snapshots,
    sharedRules,
    sharedRuleRevisions,
    sources,
    serviceMappings,
    serviceRevisions,
    groupCatalog,
    questions,
    questionRevisions,
    duplicateReview,
    confirmedDuplicates,
    commentDecisions,
    commentRevisions,
  ] = await Promise.all([
    db("onagre_mapping").select("*"),
    db("onagre_mapping_revision").select("*"),
    db("onagre_snapshot").select(
      "id",
      "fingerprint",
      "filename",
      "workbook_fingerprint",
      "created_at",
    ),
    db("onagre_shared_rule").select("*"),
    db("onagre_shared_rule_revision").select("*"),
    listDocuments(db),
    db("onagre_service_mapping").select("*"),
    db("onagre_service_mapping_revision").select("*"),
    db("onagre_group_catalog").select("*"),
    db("onagre_question").select("*"),
    db("onagre_question_revision").select("*"),
    loadDuplicateWorkspace(db),
    loadConfirmedDuplicates(db),
    db("onagre_comment_decision").select("*"),
    db("onagre_comment_revision").select("*"),
  ]);
  return new Response(
    JSON.stringify(
      {
        format: "pitchou-onagre-decisions-v1",
        exportedAt: new Date().toISOString(),
        mappings,
        revisions,
        snapshots,
        sharedRules,
        sharedRuleRevisions,
        sources,
        serviceMappings,
        serviceRevisions,
        groupCatalog,
        questions,
        questionRevisions,
        duplicateReview,
        confirmedDuplicates,
        commentDecisions,
        commentRevisions,
      },
      null,
      2,
    ),
    {
      headers: {
        "content-type": "application/json",
        "content-disposition": 'attachment; filename="onagre-correspondances.json"',
        "cache-control": "no-store",
      },
    },
  );
};
