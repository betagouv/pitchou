import type { Localisation } from "./localisation.ts";

/** Personal tracking can include dossiers outside the user's groups. */
export function serviceLabel(localisation: Localisation, followedOnly = false): string {
  if (followedOnly) return "dossiers suivis";
  return localisation === "france"
    ? "dossiers en France entière (lecture seule)"
    : "dossiers dans vos territoires d'affectation";
}
