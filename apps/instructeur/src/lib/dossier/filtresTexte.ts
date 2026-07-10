import { retirerAccents } from "@pitchou/common/manipulationStrings.ts";
import { trouverDossiersIdCorrespondantsÀTexte } from "$lib/dossier/rechercherDansDossier.ts";

import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";

/**
 * Crée un filtre pour rechercher dans les dossiers par texte.
 * Détecte automatiquement si le texte contient des chiffres :
 * - Avec chiffres : recherche dans les identifiants, départements, codes postaux, etc.
 * - Sans chiffres : utilise lunr pour la recherche textuelle avec support du français.
 *
 * cf. https://github.com/MihaiValentin/lunr-languages/issues/66
 * lunr.fr n'indexe pas les chiffres, donc on gère la recherche sur les nombres avec une fonction séparée.
 */
export function créerFiltreTexte(
  texteÀChercher: string,
  dossiers: DossierRésumé[],
): (dossier: DossierRésumé) => boolean {
  // Si le texte contient des chiffres, utiliser la recherche directe
  if (texteÀChercher.match(/\d[\dA-Za-z\-]*/)) {
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
        String(id) === texteÀChercher ||
        départements?.includes(texteÀChercher || "") ||
        communesCodes?.includes(texteÀChercher || "") ||
        number_demarches_simplifiées === texteÀChercher ||
        historique_identifiant_demande_onagre === texteÀChercher
      );
    };
  } else {
    // Sinon, utiliser lunr pour la recherche textuelle.
    // On découpe le texte en mots (les tirets séparent les communes composées)
    // puis, pour chaque mot, on cherche à la fois le terme exact — passé par le
    // stemmer français — et son préfixe (`mot*`). La saisie partielle trouve ainsi
    // la commune avant la fin de la frappe (« cleyra » → « Cleyrac »), tout en
    // gardant les correspondances de mots racinisés que le préfixe seul manquerait
    // (« bordeaux » est indexé « bordeau », donc `bordeaux*` ne matcherait pas).
    const mots = retirerAccents(texteÀChercher)
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean);
    const aRechercher = mots.map((mot) => `${mot} ${mot}*`).join(" ");
    const dossiersIdCorrespondantsÀTexte = trouverDossiersIdCorrespondantsÀTexte(
      aRechercher,
      dossiers,
    );

    return (dossier) => {
      return dossiersIdCorrespondantsÀTexte.has(dossier.id);
    };
  }
}
