import type { Knex } from "knex";
import { phaseTieBreakOrder } from "@pitchou/common/phases.ts";

/** Shared by histories and latest-phase queries, including exports. */
export function orderPhaseEvents(query: Knex.QueryBuilder) {
  return query
    .orderBy("evenement_phase_dossier.timestamp", "desc")
    .orderByRaw("array_position(?::text[], evenement_phase_dossier.phase) desc nulls last", [
      [...phaseTieBreakOrder],
    ])
    .orderBy("evenement_phase_dossier.phase", "desc");
}
