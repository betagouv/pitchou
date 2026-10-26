import type { OnagreMapping } from "@pitchou/types/onagre.ts";
import type { OnagreImportRecord } from "@pitchou/types/onagreImport.ts";
import type { FrozenInput, Source } from "./state.ts";
import { planActivity, planMotif, type Planning } from "./choices.ts";
import { planText } from "./text.ts";

export function planFields(
  record: OnagreImportRecord,
  source: Source | null,
  mappings: OnagreMapping[],
  activities: FrozenInput["activities"],
) {
  const plan = { columns: {}, fields: [] };
  record.plan = plan;
  if (!source) return;
  const ctx: Planning = {
    source,
    mappings,
    activities,
    plan,
    omissions: record.omissions,
    issues: record.issues,
  };
  planActivity(ctx);
  planMotif(ctx);
  planText(ctx);
}
