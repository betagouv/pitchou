import type { DossierActeur, Involvement } from "@pitchou/types/dossierActeur.ts";
import type {
  AdminDossierDetail,
  AdminDossierIdentite,
  AdminIdentiteDossierType,
} from "$lib/actions/adminDossiers.ts";

export function acteurOf(
  detail: AdminDossierDetail,
  involvement: Involvement,
): DossierActeur | undefined {
  return detail.acteurs.find(({ involvements }) => involvements.includes(involvement));
}

/** The déposant when it is not the mandataire: the demandeur identity of the admin form. */
export function demandeurActeur(detail: AdminDossierDetail): DossierActeur | undefined {
  return detail.acteurs.find(
    ({ involvements }) => involvements.includes("deposant") && !involvements.includes("mandataire"),
  );
}

/** An acteur as an identity of the admin relations payload. */
export function identiteOf(
  type: AdminIdentiteDossierType,
  acteur: DossierActeur | undefined,
): AdminDossierIdentite | undefined {
  if (!acteur) return undefined;
  const { last_name, first_names, email, phone, role } = acteur;
  return { type, last_name, first_names, email, phone, role };
}
