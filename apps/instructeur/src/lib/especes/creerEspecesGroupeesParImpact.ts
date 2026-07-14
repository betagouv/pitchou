import type {
  ActiviteMenancante,
  DescriptionMenacesEspeces,
  ImpactQuantifie,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "@pitchou/types/especes.d.ts";

const VALEUR_NON_RENSEIGNE = `(non renseigné)`;

function individus(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return especeImpactee.nombreIndividus || VALEUR_NON_RENSEIGNE;
}

function surface(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return especeImpactee.surfaceHabitatDétruit
    ? `${especeImpactee.surfaceHabitatDétruit}m²`
    : VALEUR_NON_RENSEIGNE;
}

function nids(especeImpactee: OiseauAtteint): string {
  return especeImpactee.nombreNids ? `${especeImpactee.nombreNids}` : VALEUR_NON_RENSEIGNE;
}

function œufs(especeImpactee: OiseauAtteint): string {
  return especeImpactee.nombreOeufs ? `${especeImpactee.nombreOeufs}` : VALEUR_NON_RENSEIGNE;
}

const getterImpactQuantifie: Map<ImpactQuantifie, (esp: any) => string> = new Map([
  ["Nombre d'individus", individus],
  ["Nids", nids],
  ["Œufs", œufs],
  ["Surface habitat détruit (m²)", surface],
]);

export type EspeceImpacteeSimplifiee = {
  nomVernaculaire: string;
  nomScientifique: string;
  CD_REF: string;
  espèceMinistérielle: boolean;
  espèceCNPN: boolean;
  détails: string[];
};

export type EspecesParActivite = {
  activité: string;
  impactsQuantifiés: ImpactQuantifie[];
  espèces: EspeceImpacteeSimplifiee[];
};

export function creerEspecesGroupeesParImpact(
  especesImpactees: DescriptionMenacesEspeces,
  identifiantPitchouVersActiviteEtImpactsQuantifies: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: ImpactQuantifie[] }
  >,
): EspecesParActivite[] {
  const _especesImpacteesParIdentifiantActivite: Map<
    ActiviteMenancante["Identifiant Pitchou"] | undefined,
    EspeceImpacteeSimplifiee[]
  > = new Map();

  function push(especeImpactee: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte) {
    const identifiantPitchou = especeImpactee.activité
      ? especeImpactee.activité["Identifiant Pitchou"]
      : undefined;

    const esps = _especesImpacteesParIdentifiantActivite.get(identifiantPitchou) || [];
    const impactsQuantifies =
      identifiantPitchouVersActiviteEtImpactsQuantifies.get(identifiantPitchou ?? "")
        ?.impactsQuantifiés || [];

    esps.push({
      CD_REF: especeImpactee.espèce.CD_REF,
      nomScientifique: [...especeImpactee.espèce.nomsScientifiques][0],
      nomVernaculaire: [...especeImpactee.espèce.nomsVernaculaires][0],
      espèceCNPN: especeImpactee.espèce.espèceCNPN === "O" ? true : false,
      espèceMinistérielle: especeImpactee.espèce.espèceMinistérielle === "O" ? true : false,
      détails: [...impactsQuantifies].map((donneeSecondaire) => {
        const funcDetail = getterImpactQuantifie.get(donneeSecondaire);

        if (!funcDetail) {
          throw new Error(
            `Fonction de récupération des détails de l'espèce non définie pour le type de données ${donneeSecondaire}`,
          );
        }

        return funcDetail(especeImpactee);
      }),
    });
    _especesImpacteesParIdentifiantActivite.set(identifiantPitchou, esps);
  }

  for (const classif of ["oiseau", "faune non-oiseau", "flore"] as const) {
    if (especesImpactees[classif]) {
      for (const especeImpactee of especesImpactees[classif]) {
        push(especeImpactee);
      }
    }
  }

  for (const [activite, esps] of _especesImpacteesParIdentifiantActivite) {
    _especesImpacteesParIdentifiantActivite.set(
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

  return [..._especesImpacteesParIdentifiantActivite].map(([identifiant, especes]) => ({
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
