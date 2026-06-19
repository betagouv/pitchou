import { json } from "d3-fetch";
import { isValidDate } from "@pitchou/common/typeFormat.ts";
import { store } from "../store.svelte.ts";
import debounce from "just-debounce-it";

import type { IndicateursAARRI } from "@pitchou/types/API_Pitchou.ts";
import type {
  ÉvènementMétrique,
  ÉvènementRechercheDossiersDétails,
} from "@pitchou/types/évènement.d.ts";

/**
 * Charge les indicateurs AARRI depuis le backend
 */
export async function chargerIndicateursAARRI(): Promise<IndicateursAARRI[]> {
  try {
    const indicateursParDate = await json(`/api/aarri`).then((result) => {
      if (!Array.isArray(result)) {
        throw new Error(
          `Réponse invalide reçue du serveur pour la route /api/aarri : le résultat n'est pas un array`,
        );
      }
      return result.map((indicateurs) => ({ ...indicateurs, date: new Date(indicateurs.date) }));
    });
    if (!isIndicateursAARRIParDate(indicateursParDate)) {
      throw new Error(
        `Réponse invalide reçue du serveur pour la route /api/aarri. Réponse reçue : ${JSON.stringify(indicateursParDate)}`,
      );
    }
    return indicateursParDate;
  } catch (error) {
    console.error("Erreur lors du chargement des indicateurs AARRI :", error);
    throw new Error(`${error}`);
  }
}

function isIndicateursAARRIParDate(
  indicateursParDate: any,
): indicateursParDate is IndicateursAARRI[] {
  if (!Array.isArray(indicateursParDate)) {
    return false;
  }

  return indicateursParDate.every(isIndicateursAARRI);
}

function isIndicateursAARRI(indicateurs: any): indicateurs is IndicateursAARRI {
  if (
    Object(indicateurs) === indicateurs &&
    typeof indicateurs.nombreBaseUtilisateuricePotentielle === "number" &&
    indicateurs.nombreBaseUtilisateuricePotentielle !== 0 &&
    typeof indicateurs.nombreUtilisateuriceAcquis === "number" &&
    typeof indicateurs.nombreUtilisateuriceActif === "number" &&
    typeof indicateurs.nombreUtilisateuriceRetenu === "number" &&
    typeof indicateurs.nombreUtilisateuriceImpact === "number" &&
    isValidDate(indicateurs.date)
  ) {
    return true;
  }
  return false;
}

export function envoyerÉvènement(évènement: ÉvènementMétrique) {
  if (store.capabilities.créerÉvènementMetrique) {
    store.capabilities
      .créerÉvènementMetrique(évènement)
      .catch((e) => console.warn(`Échec lors de la création de l’évènement:`, e, évènement));
  }
}

export const envoyerÉvènementModifierCommentaire = debounce(
  () => envoyerÉvènement({ type: "modifierCommentaireInstruction" }),
  15 * 60 * 1000,
  true,
);

export const envoyerÉvènementRechercherUnDossier = debounce(
  (détails: ÉvènementRechercheDossiersDétails) =>
    envoyerÉvènement({ type: "rechercherDesDossiers", détails }),
  10 * 1000,
  true,
);

export const envoyerÉvènementModifierPrescription = debounce(
  () => envoyerÉvènement({ type: "modifierPrescription" }),
  15 * 60 * 1000,
  true,
);
