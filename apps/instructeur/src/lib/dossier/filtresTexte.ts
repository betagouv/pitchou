import { retirerAccents } from "@pitchou/common/manipulationStrings.ts";
import { trouverDossiersIdCorrespondantsATexte } from "$lib/dossier/rechercherDansDossier.ts";

import type { DossierResume } from "@pitchou/types/API_Pitchou.ts";

/**
 * Creates a filter to search within dossiers by text.
 * Automatically detects whether the text contains digits:
 * - With digits: searches in identifiers, départements, postal codes, etc.
 * - Without digits: uses lunr for text search with French support.
 *
 * cf. https://github.com/MihaiValentin/lunr-languages/issues/66
 * lunr.fr does not index digits, so we handle number search with a separate function.
 */
export function creerFiltreTexte(
  texteAChercher: string,
  dossiers: DossierResume[],
): (dossier: DossierResume) => boolean {
  // If the text contains digits, use direct search
  if (texteAChercher.match(/\d[\dA-Za-z\-]*/)) {
    return (dossier) => {
      const {
        id,
        départements,
        communes,
        number_demarches_simplifiées,
        historique_identifiant_demande_onagre,
      } = dossier;
      const communesCodes = communes?.map(({ postalCode }) => postalCode).filter((c) => c) || [];

      return (
        String(id) === texteAChercher ||
        départements?.includes(texteAChercher || "") ||
        communesCodes?.includes(texteAChercher || "") ||
        number_demarches_simplifiées === texteAChercher ||
        historique_identifiant_demande_onagre === texteAChercher
      );
    };
  } else {
    // Otherwise, use lunr for text search
    const texteSansAccents = retirerAccents(texteAChercher);
    // To search communes that contain hyphens with lunr,
    // we need to pass the string between "".
    const aRechercher = texteSansAccents.match(/(\w-)+/)
      ? `"${texteSansAccents}"`
      : texteSansAccents;
    const dossiersIdCorrespondantsATexte = trouverDossiersIdCorrespondantsATexte(
      aRechercher,
      dossiers,
    );

    return (dossier) => {
      return dossiersIdCorrespondantsATexte.has(dossier.id);
    };
  }
}
