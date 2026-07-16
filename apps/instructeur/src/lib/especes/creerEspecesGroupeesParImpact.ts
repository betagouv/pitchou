import type {
  ActiviteMenancante,
  DescriptionMenacesEspeces,
  QuantifiedImpact,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "@pitchou/types/especes.d.ts";

const VALUE_NOT_PROVIDED = `(non renseigné)`;

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

export type SimplifiedEspeceImpactee = {
  nomVernaculaire: string;
  nomScientifique: string;
  CD_REF: string;
  espèceMinistérielle: boolean;
  espèceCNPN: boolean;
  détails: string[];
};

export type EspecesByActivite = {
  activité: string;
  impactsQuantifiés: QuantifiedImpact[];
  espèces: SimplifiedEspeceImpactee[];
};

export function createEspecesGroupedByImpact(
  especesImpactees: DescriptionMenacesEspeces,
  identifiantPitchouVersActiviteEtImpactsQuantifies: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
  >,
): EspecesByActivite[] {
  const _especesImpacteesByIdentifiantActivite: Map<
    ActiviteMenancante["Identifiant Pitchou"] | undefined,
    SimplifiedEspeceImpactee[]
  > = new Map();

  function push(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte) {
    const identifiantPitchou = especeImpactee.activité
      ? especeImpactee.activité["Identifiant Pitchou"]
      : undefined;

    const esps = _especesImpacteesByIdentifiantActivite.get(identifiantPitchou) || [];
    const impactsQuantifies =
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiantPitchou ?? "")
        ?.impactsQuantifiés || [];

    esps.push({
      CD_REF: especeImpactee.espèce.CD_REF,
      nomScientifique: [...especeImpactee.espèce.nomsScientifiques][0],
      nomVernaculaire: [...especeImpactee.espèce.nomsVernaculaires][0],
      espèceCNPN: especeImpactee.espèce.espèceCNPN === "O" ? true : false,
      espèceMinistérielle: especeImpactee.espèce.espèceMinistérielle === "O" ? true : false,
      détails: [...impactsQuantifies].map((secondaryData) => {
        const funcDetail = getterImpactQuantifie.get(secondaryData);

        if (!funcDetail) {
          throw new Error(
            `Fonction de récupération des détails de l'espèce non définie pour le type de données ${secondaryData}`,
          );
        }

        return funcDetail(especeImpactee);
      }),
    });
    _especesImpacteesByIdentifiantActivite.set(identifiantPitchou, esps);
  }

  for (const classif of ["oiseau", "faune non-oiseau", "flore"] as const) {
    if (especesImpactees[classif]) {
      for (const especeImpactee of especesImpactees[classif]) {
        push(especeImpactee);
      }
    }
  }

  for (const [activite, esps] of _especesImpacteesByIdentifiantActivite) {
    _especesImpacteesByIdentifiantActivite.set(
      activite,
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

  return [..._especesImpacteesByIdentifiantActivite].map(([identifiant, especes]) => ({
    activité:
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiant ?? "")?.[
        "Libellé Pitchou"
      ] ?? `Type d'impact non-renseignée`,
    impactsQuantifiés:
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiant ? identifiant : "")
        ?.impactsQuantifiés || [],
    espèces: especes,
  }));
}
