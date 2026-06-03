import type {
  ActivitéMenançante,
  DescriptionMenacesEspèces,
  ImpactQuantifié,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "../../types/especes.d.ts";

const VALEUR_NON_RENSEIGNÉ = `(non renseigné)`;

function individus(espèceImpactée: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return espèceImpactée.nombreIndividus || VALEUR_NON_RENSEIGNÉ;
}

function surface(espèceImpactée: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte): string {
  return espèceImpactée.surfaceHabitatDétruit
    ? `${espèceImpactée.surfaceHabitatDétruit}m²`
    : VALEUR_NON_RENSEIGNÉ;
}

function nids(espèceImpactée: OiseauAtteint): string {
  return espèceImpactée.nombreNids ? `${espèceImpactée.nombreNids}` : VALEUR_NON_RENSEIGNÉ;
}

function œufs(espèceImpactée: OiseauAtteint): string {
  return espèceImpactée.nombreOeufs ? `${espèceImpactée.nombreOeufs}` : VALEUR_NON_RENSEIGNÉ;
}

const getterImpactQuantifié: Map<ImpactQuantifié, (esp: any) => string> = new Map([
  ["Nombre d'individus", individus],
  ["Nids", nids],
  ["Œufs", œufs],
  ["Surface habitat détruit (m²)", surface],
]);

export type EspèceImpactéeSimplifiée = {
  nomVernaculaire: string;
  nomScientifique: string;
  CD_REF: string;
  espèceMinistérielle: boolean;
  espèceCNPN: boolean;
  détails: string[];
};

export type EspècesParActivité = {
  activité: string;
  impactsQuantifiés: ImpactQuantifié[];
  espèces: EspèceImpactéeSimplifiée[];
};

export function créerEspècesGroupéesParImpact(
  espècesImpactées: DescriptionMenacesEspèces,
  identifiantPitchouVersActivitéEtImpactsQuantifiés: Map<
    string,
    ActivitéMenançante & { impactsQuantifiés: ImpactQuantifié[] }
  >,
): EspècesParActivité[] {
  const _espècesImpactéesParIdentifiantActivité: Map<
    ActivitéMenançante["Identifiant Pitchou"] | undefined,
    EspèceImpactéeSimplifiée[]
  > = new Map();

  function push(espèceImpactée: OiseauAtteint | FauneNonOiseauAtteinte | FloreAtteinte) {
    const identifiantPitchou = espèceImpactée.activité
      ? espèceImpactée.activité["Identifiant Pitchou"]
      : undefined;

    const esps = _espècesImpactéesParIdentifiantActivité.get(identifiantPitchou) || [];
    const impactsQuantifiés =
      identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiantPitchou ?? "")
        ?.impactsQuantifiés || [];

    esps.push({
      CD_REF: espèceImpactée.espèce.CD_REF,
      nomScientifique: [...espèceImpactée.espèce.nomsScientifiques][0],
      nomVernaculaire: [...espèceImpactée.espèce.nomsVernaculaires][0],
      espèceCNPN: espèceImpactée.espèce.espèceCNPN === "O" ? true : false,
      espèceMinistérielle: espèceImpactée.espèce.espèceMinistérielle === "O" ? true : false,
      détails: [...impactsQuantifiés].map((donnéeSecondaire) => {
        const funcDetail = getterImpactQuantifié.get(donnéeSecondaire);

        if (!funcDetail) {
          throw new Error(
            `Fonction de récupération des détails de l'espèce non définie pour le type de données ${donnéeSecondaire}`,
          );
        }

        return funcDetail(espèceImpactée);
      }),
    });
    _espècesImpactéesParIdentifiantActivité.set(identifiantPitchou, esps);
  }

  for (const classif of ["oiseau", "faune non-oiseau", "flore"] as const) {
    if (espècesImpactées[classif]) {
      for (const espèceImpactée of espècesImpactées[classif]) {
        push(espèceImpactée);
      }
    }
  }

  for (const [activité, esps] of _espècesImpactéesParIdentifiantActivité) {
    _espècesImpactéesParIdentifiantActivité.set(
      activité,
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

  return [..._espècesImpactéesParIdentifiantActivité].map(([identifiant, espèces]) => ({
    activité:
      identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiant ?? "")?.[
        "Libellé Pitchou"
      ] ?? `Type d'impact non-renseignée`,
    impactsQuantifiés:
      identifiantPitchouVersActivitéEtImpactsQuantifiés.get(identifiant ? identifiant : "")
        ?.impactsQuantifiés || [],
    espèces,
  }));
}
