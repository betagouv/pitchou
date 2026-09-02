import { TYPE_IMPACT_NOT_PROVIDED, VALUE_NOT_PROVIDED } from "./especesByTypeImpact.ts";

import type {
  ActiviteMenancante,
  DescriptionMenacesEspeces,
  QuantifiedImpact,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "@pitchou/types/especes.d.ts";
import type { EspecesByTypeImpact, SimplifiedEspeceImpactee } from "./especesByTypeImpact.ts";

function individus(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return especeImpactee.nombreIndividus || VALUE_NOT_PROVIDED;
}

function surface(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return especeImpactee.surfaceHabitatDétruit
    ? `${especeImpactee.surfaceHabitatDétruit}m²`
    : VALUE_NOT_PROVIDED;
}

function nids(especeImpactee: OiseauAtteint): string {
  return especeImpactee.nombreNids ? `${especeImpactee.nombreNids}` : VALUE_NOT_PROVIDED;
}

function œufs(especeImpactee: OiseauAtteint): string {
  return especeImpactee.nombreOeufs ? `${especeImpactee.nombreOeufs}` : VALUE_NOT_PROVIDED;
}

const getterImpactQuantifie: Map<QuantifiedImpact, (esp: any) => string> = new Map([
  ["Nombre d'individus", individus],
  ["Nids", nids],
  ["Œufs", œufs],
  ["Surface habitat détruit (m²)", surface],
]);

export function createEspecesGroupedByTypeImpact(
  especesImpactees: DescriptionMenacesEspeces,
  identifiantPitchouVersActiviteEtImpactsQuantifies: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
  >,
): EspecesByTypeImpact[] {
  const _especesByIdentifiantTypeImpact: Map<
    ActiviteMenancante["Identifiant Pitchou"] | undefined,
    SimplifiedEspeceImpactee[]
  > = new Map();

  function push(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte) {
    const identifiantPitchou = especeImpactee.activité
      ? especeImpactee.activité["Identifiant Pitchou"]
      : undefined;

    const esps = _especesByIdentifiantTypeImpact.get(identifiantPitchou) || [];
    const impactsQuantifies =
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiantPitchou ?? "")
        ?.impactsQuantifiés || [];

    esps.push({
      CD_REF: especeImpactee.espèce.CD_REF,
      nomScientifique: [...especeImpactee.espèce.nomsScientifiques][0],
      nomVernaculaire: [...especeImpactee.espèce.nomsVernaculaires][0],
      especeCNPN: especeImpactee.espèce.espèceCNPN === "O" ? true : false,
      especeMinisterielle: especeImpactee.espèce.espèceMinistérielle === "O" ? true : false,
      impactsValues: [...impactsQuantifies].map((secondaryData) => {
        const funcDetail = getterImpactQuantifie.get(secondaryData);

        if (!funcDetail) {
          throw new Error(
            `Fonction de récupération des détails de l'espèce non définie pour le type de données ${secondaryData}`,
          );
        }

        return funcDetail(especeImpactee);
      }),
    });
    _especesByIdentifiantTypeImpact.set(identifiantPitchou, esps);
  }

  for (const classif of ["oiseau", "faune non-oiseau", "flore"] as const) {
    if (especesImpactees[classif]) {
      for (const especeImpactee of especesImpactees[classif]) {
        push(especeImpactee);
      }
    }
  }

  for (const [identifiantTypeImpact, esps] of _especesByIdentifiantTypeImpact) {
    _especesByIdentifiantTypeImpact.set(
      identifiantTypeImpact,
      esps.toSorted(({ nomScientifique: nom1 }, { nomScientifique: nom2 }) => {
        if (nom1 < nom2) {
          return -1;
        }
        if (nom1 > nom2) {
          return 1;
        }
        return 0;
      }),
    );
  }

  return [..._especesByIdentifiantTypeImpact].map(([identifiant, especes]) => ({
    typeImpact:
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiant ?? "")?.[
        "Libellé Pitchou"
      ] ?? TYPE_IMPACT_NOT_PROVIDED,
    criteriaAllowed:
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiant ? identifiant : "")
        ?.impactsQuantifiés || [],
    especes,
  }));
}
