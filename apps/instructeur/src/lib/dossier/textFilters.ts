import { removeAccents } from "@pitchou/common/stringManipulation.ts";
import { findDossierIdsMatchingText } from "$lib/dossier/searchInDossier.ts";

import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

/**
 * Creates a filter to search within dossiers by text.
 * Automatically detects whether the text contains digits:
 * - With digits: searches in identifiers, départements, postal codes, etc.
 * - Without digits: uses lunr for text search with French support.
 *
 * cf. https://github.com/MihaiValentin/lunr-languages/issues/66
 * lunr.fr does not index digits, so we handle number search with a separate function.
 */
export function createTextFilter(
  textToSearch: string,
  dossiers: DossierSummary[],
): (dossier: DossierSummary) => boolean {
  // If the text contains digits, use direct search
  if (textToSearch.match(/\d[\dA-Za-z\-]*/)) {
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
        String(id) === textToSearch ||
        départements?.includes(textToSearch || "") ||
        communesCodes?.includes(textToSearch || "") ||
        number_demarches_simplifiées === textToSearch ||
        historique_identifiant_demande_onagre === textToSearch
      );
    };
  } else {
    // Otherwise, use lunr for text search
    const textWithoutAccents = removeAccents(textToSearch);
    // To search communes that contain hyphens with lunr,
    // we need to pass the string between "".
    const toSearch = textWithoutAccents.match(/(\w-)+/)
      ? `"${textWithoutAccents}"`
      : textWithoutAccents;
    const dossierIdsMatchingText = findDossierIdsMatchingText(toSearch, dossiers);

    return (dossier) => {
      return dossierIdsMatchingText.has(dossier.id);
    };
  }
}
