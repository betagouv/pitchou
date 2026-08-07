import type {
  ActiviteMenancante,
  ByClassification,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import { isClassif } from "./classification.ts";

export function actMetTransArraysToMapBundle(
  rawActivites: ByClassification<ActiviteMenancante[]>,
  rawMethodes: MethodeMenancante[],
  rawMoyensDePoursuite: MoyenDePoursuiteMenacant[],
): {
  activités: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>;
  méthodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>;
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >;
} {
  const activites: ByClassification<Map<string, ActiviteMenancante>> = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };
  for (const classification in rawActivites) {
    // @ts-ignore Iterating the known classification keys.
    for (const activite of rawActivites[classification] as ActiviteMenancante[]) {
      if (activite["Identifiant Pitchou"] === undefined || activite["Identifiant Pitchou"] === "")
        break;
      activite["Code rapportage européen"] = activite["Code rapportage européen"].toString();
      // @ts-ignore Classification is a known map key.
      activites[classification].set(activite["Identifiant Pitchou"], activite);
    }
  }
  const methodes: ByClassification<Map<string, MethodeMenancante>> = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };
  for (const methode of rawMethodes) {
    const classification = methode["Espèces"];
    if (!classification.trim() && (methode.Code === undefined || methode.Code === "")) break;
    if (!isClassif(classification)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classification}`);
    }
    methode.Code = methode.Code.toString();
    Object.freeze(methode);
    methodes[classification].set(methode.Code, methode);
  }
  const moyensDePoursuite: ByClassification<Map<string, MoyenDePoursuiteMenacant>> = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };
  for (const moyen of rawMoyensDePoursuite) {
    const classification = moyen["Espèces"];
    if (!classification.trim() && (moyen.Code === undefined || moyen.Code === "")) break;
    if (!isClassif(classification)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classification}.}`);
    }
    moyen.Code = moyen.Code.toString();
    Object.freeze(moyen);
    moyensDePoursuite[classification].set(moyen.Code, moyen);
  }
  return { activités: activites, méthodes: methodes, moyensDePoursuite };
}
