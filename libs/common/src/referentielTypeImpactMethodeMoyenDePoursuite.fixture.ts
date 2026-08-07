import type { PitchouState } from "@pitchou/types/pitchouState.ts";
import type {
  ReferentielProjete,
  TypeImpactProjete,
  ValeurProjetee,
} from "./referentielTypeImpactMethodeMoyenDePoursuite.fixture.types.ts";

type Referentiel = NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>;
const CLASSIFICATIONS = ["oiseau", "faune non-oiseau", "flore"] as const;
function byClassificationThenKey<T extends TypeImpactProjete | ValeurProjetee>(
  key: keyof T & string,
) {
  return (a: T, b: T): number => {
    const order =
      CLASSIFICATIONS.indexOf(a.classification) - CLASSIFICATIONS.indexOf(b.classification);
    return order || String(a[key]).localeCompare(String(b[key]));
  };
}

export function projectReferentiel(referentiel: Referentiel): ReferentielProjete {
  const typesImpact: TypeImpactProjete[] = [];
  const methodes: ValeurProjetee[] = [];
  const moyensDePoursuite: ValeurProjetee[] = [];
  for (const classification of CLASSIFICATIONS) {
    for (const activite of referentiel.activités[classification].values()) {
      typesImpact.push({
        identifiantPitchou: activite["Identifiant Pitchou"].trim(),
        codeEuropeen: activite["Code rapportage européen"],
        classification,
        libellePitchou: activite["Libellé Pitchou"],
        criteres: {
          methode: activite["Méthode"] === "Oui",
          moyenDePoursuite: activite["Moyen de poursuite"] === "Oui",
          nombreIndividus: activite["Nombre d'individus"] === "Oui",
          nids: activite["Nids"] === "Oui",
          oeufs: activite["Œufs"] === "Oui",
          surfaceHabitatDetruit: activite["Surface habitat détruit (m²)"] === "Oui",
        },
      });
    }
    for (const methode of referentiel.méthodes[classification].values()) {
      methodes.push({
        code: methode.Code,
        classification,
        libellePitchou: methode["Libellé Pitchou"],
      });
    }
    for (const moyen of referentiel.moyensDePoursuite[classification].values()) {
      moyensDePoursuite.push({
        code: moyen.Code,
        classification,
        libellePitchou: moyen["Libellé Pitchou"],
      });
    }
  }
  return {
    typesImpact: typesImpact.sort(byClassificationThenKey("identifiantPitchou")),
    methodes: methodes.sort(byClassificationThenKey("code")),
    moyensDePoursuite: moyensDePoursuite.sort(byClassificationThenKey("code")),
  };
}

export { REFERENTIEL_ATTENDU } from "./referentielTypeImpactMethodeMoyenDePoursuite.fixture.expected.ts";
