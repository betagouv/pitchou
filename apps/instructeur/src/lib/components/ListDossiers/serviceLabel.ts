import type { Localisation } from "./localisation.ts";

/** Trailing counter label names the geographic scope, not ownership by a service. */
export function serviceLabel(localisation: Localisation, followedOnly = false): string {
  const dossiers = followedOnly ? "dossiers suivis" : "dossiers";
  return localisation === "france"
    ? `${dossiers} en France entière (lecture seule)`
    : `${dossiers} dans vos territoires d'affectation`;
}
