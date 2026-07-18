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
    // Otherwise, use lunr for text search.
    // Split the text into words (hyphens separate compound commune names)
    // then, for each word, search both the exact term — run through the French
    // stemmer — and its prefix (`word*`). Partial input thus finds the commune
    // before typing ends (« cleyra » → « Cleyrac »), while keeping the stemmed
    // word matches that the prefix alone would miss (« bordeaux » is indexed
    // « bordeau », so `bordeaux*` would not match).
    const words = removeAccents(textToSearch)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    const toSearch = words.map((word) => `${word} ${word}*`).join(" ");
    const dossierIdsMatchingText = findDossierIdsMatchingText(toSearch, dossiers);

    return (dossier) => {
      return dossierIdsMatchingText.has(dossier.id);
    };
  }
}
