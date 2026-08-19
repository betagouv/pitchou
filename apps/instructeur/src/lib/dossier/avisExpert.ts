/**
 * Experts whose avis is an official avis on the derogation, as opposed to the
 * « Autre expert » avis gathered by the instructeur.
 *
 * They are the only avis shown in read-only mode, and the only ones counted as
 * a « CNPN/CSRPN » avis when filtering the dossier list.
 */
export const OFFICIAL_AVIS_EXPERTS: ReadonlySet<string> = new Set(["CSRPN", "CNPN", "Ministre"]);

export function isOfficialAvisExpert(expert: string | null | undefined): boolean {
  return typeof expert === "string" && OFFICIAL_AVIS_EXPERTS.has(expert);
}
