import type { OiseauAtteint, FauneNonOiseauAtteinte, FloreAtteinte } from "../types/especes.d.ts";

export const trierParOrdreAlphabétiqueEspèce = (
  espècesAtteintes: OiseauAtteint[] | FauneNonOiseauAtteinte[] | FloreAtteinte[],
): OiseauAtteint[] | FauneNonOiseauAtteinte[] | FloreAtteinte[] => {
  return [...espècesAtteintes].sort((espèceAtteinteA, espèceAtteinteB) => {
    const nomsVernaculairesA = [...espèceAtteinteA.espèce.nomsVernaculaires];
    const nomsVernaculairesB = [...espèceAtteinteB.espèce.nomsVernaculaires];

    if (
      nomsVernaculairesA.length >= 1 &&
      nomsVernaculairesA[0] !== "" &&
      nomsVernaculairesB.length >= 1
    ) {
      return nomsVernaculairesA[0].localeCompare(nomsVernaculairesB[0], "fr");
    }

    return 0;
  });
};

export const grouperParActivité = (
  espècesAtteintes: OiseauAtteint[] | FauneNonOiseauAtteinte[] | FloreAtteinte[],
): OiseauAtteint[] | FauneNonOiseauAtteinte[] | FloreAtteinte[] => {
  return [...espècesAtteintes].sort((espèceAtteinteA, espèceAtteinteB) => {
    if (espèceAtteinteA.activité && espèceAtteinteB.activité) {
      return espèceAtteinteA.activité["Libellé Pitchou"].localeCompare(
        espèceAtteinteB.activité["Libellé Pitchou"],
      );
    }

    if (!espèceAtteinteA.activité && espèceAtteinteB.activité) {
      return 1;
    }

    if (espèceAtteinteA.activité && !espèceAtteinteB.activité) {
      return -1;
    }

    return 0;
  });
};

export const grouperParMéthode = (
  espècesAtteintes: OiseauAtteint[] | FauneNonOiseauAtteinte[],
): OiseauAtteint[] | FauneNonOiseauAtteinte[] => {
  return [...espècesAtteintes].sort((espèceAtteinteA, espèceAtteinteB) => {
    if (espèceAtteinteA.méthode && espèceAtteinteB.méthode) {
      return espèceAtteinteA.méthode["Libellé Pitchou"].localeCompare(
        espèceAtteinteB.méthode["Libellé Pitchou"],
      );
    }

    if (!espèceAtteinteA.méthode && espèceAtteinteB.méthode) {
      return 1;
    }

    if (espèceAtteinteA.méthode && !espèceAtteinteB.méthode) {
      return -1;
    }

    return 0;
  });
};
