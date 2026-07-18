import { json } from "d3-fetch";
import { isValidDate } from "@pitchou/common/typeFormat.ts";
import { store } from "$lib/state/store.svelte.ts";
import { addRecentSearch } from "$lib/components/ListDossiers/dossiersSearch.ts";
import debounce from "just-debounce-it";

import type { IndicatorsAARRI } from "@pitchou/types/API_Pitchou.ts";
import type {
  EvenementMetrique,
  EvenementRechercheDossiersDetails,
} from "@pitchou/types/evenement.d.ts";

/**
 * Loads AARRI indicators from the backend
 */
export async function loadIndicatorsAARRI(): Promise<IndicatorsAARRI[]> {
  try {
    const indicatorsByDate = await json(`/api/aarri`).then((result) => {
      if (!Array.isArray(result)) {
        throw new Error(
          `Réponse invalide reçue du serveur pour la route /api/aarri : le résultat n'est pas un array`,
        );
      }
      return result.map((indicators) => ({ ...indicators, date: new Date(indicators.date) }));
    });
    if (!isIndicatorsAARRIByDate(indicatorsByDate)) {
      throw new Error(
        `Réponse invalide reçue du serveur pour la route /api/aarri. Réponse reçue : ${JSON.stringify(indicatorsByDate)}`,
      );
    }
    return indicatorsByDate;
  } catch (error) {
    console.error("Erreur lors du chargement des indicateurs AARRI :", error);
    throw new Error(`${error}`);
  }
}

function isIndicatorsAARRIByDate(indicatorsByDate: any): indicatorsByDate is IndicatorsAARRI[] {
  if (!Array.isArray(indicatorsByDate)) {
    return false;
  }

  return indicatorsByDate.every(isIndicatorsAARRI);
}

function isIndicatorsAARRI(indicators: any): indicators is IndicatorsAARRI {
  if (
    Object(indicators) === indicators &&
    typeof indicators.nombreBaseUtilisateuricePotentielle === "number" &&
    indicators.nombreBaseUtilisateuricePotentielle !== 0 &&
    typeof indicators.nombreUtilisateuriceAcquis === "number" &&
    typeof indicators.nombreUtilisateuriceActif === "number" &&
    typeof indicators.nombreUtilisateuriceRetenu === "number" &&
    typeof indicators.nombreUtilisateuriceImpact === "number" &&
    isValidDate(indicators.date)
  ) {
    return true;
  }
  return false;
}

export function sendEvenement(évènement: EvenementMetrique) {
  if (store.capabilities.créerÉvènementMetrique) {
    store.capabilities
      .créerÉvènementMetrique(évènement)
      .catch((e) => console.warn(`Échec lors de la création de l’évènement:`, e, évènement));
  }
}

export const sendEvenementModifierCommentaire = debounce(
  () => sendEvenement({ type: "modifierCommentaireInstruction" }),
  15 * 60 * 1000,
  true,
);

// Trailing edge: the search bar filters as the user types, so we wait until they stop
// typing before recording the event. This groups a whole search session into a single
// event carrying the final query, instead of the first keystroke.
export const sendEvenementRechercherUnDossier = debounce(
  (détails: EvenementRechercheDossiersDetails) => {
    sendEvenement({ type: "rechercherDesDossiers", détails });

    // The server records the search alongside the event; mirror it locally so the
    // suggestions stay fresh without a refetch
    const text = détails.filtres.texte?.trim();
    if (text) {
      store.recentSearches = addRecentSearch(store.recentSearches ?? [], text);
    }
  },
  10 * 1000,
  false,
);

// Last chance to record a pending search before the page dies (tab closed, reload,
// mobile browser backgrounded): send it as soon as the page becomes hidden. The metric
// POST uses keepalive so the request survives the page teardown. Only this trailing-edge
// debounce is flushed — flushing the leading-edge ones would send their event twice.
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      sendEvenementRechercherUnDossier.flush();
    }
  });
}

export const sendEvenementModifierPrescription = debounce(
  () => sendEvenement({ type: "modifierPrescription" }),
  15 * 60 * 1000,
  true,
);
