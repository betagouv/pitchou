import type { Knex } from "knex";
import { phaseTieBreakOrder } from "@pitchou/common/phases.ts";

/** Shared by histories and latest-phase queries, including exports. */
export function orderPhaseEvents(query: Knex.QueryBuilder) {
  return query
    .orderByRaw(
      "date_trunc('second', COALESCE(evenement_phase_dossier.\"timestamp\", evenement_phase_dossier.recorded_at)::timestamptz + interval '0.5 seconds') desc",
    )
    .orderByRaw("array_position(?::text[], evenement_phase_dossier.phase) desc nulls last", [
      [...phaseTieBreakOrder],
    ])
    .orderBy("evenement_phase_dossier.phase", "desc");
}
