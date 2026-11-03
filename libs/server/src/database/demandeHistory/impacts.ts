import { CRITERES_QUANTIFIES } from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";
import { isStatutListeRouge } from "@pitchou/common/especes/listeRouge.ts";
import type { FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { DemandeState } from "./state.ts";

export function historicalImpacts(state: DemandeState): FrontEndImpactOnEspece[] {
  return state.impacts.map((impact) => {
    const espece = state.especes.find(({ cd_ref }) => cd_ref === impact.cd_ref);
    const type = state.impactTypes.find(
      ({ identifiant_pitchou }) => identifiant_pitchou === impact.impact_type,
    );
    return {
      espece: {
        CD_REF: impact.cd_ref,
        nomVernaculaire: espece?.noms_vernaculaires?.[0] ?? impact.cd_ref,
        nomScientifique: espece?.noms_scientifiques?.[0] ?? impact.cd_ref,
        especeCNPN: espece?.espece_cnpn ?? false,
        especeMinisterielle: espece?.espece_ministerielle ?? false,
        statutListeRouge: isStatutListeRouge(espece?.statut_liste_rouge)
          ? espece.statut_liste_rouge
          : null,
      },
      typeImpact: type
        ? {
            identifiantPitchou: type.identifiant_pitchou,
            libelle: type.libelle_pitchou,
            criteriaAllowed: CRITERES_QUANTIFIES.filter(([key]) => type[key]).map(
              ([, label]) => label,
            ),
          }
        : null,
      methode:
        state.impactMethodes.find(({ code }) => code === impact.impact_methode)?.libelle_pitchou ??
        null,
      moyenDePoursuite:
        state.impactMoyens.find(
          ({ code, classification }) =>
            code === impact.impact_moyen_de_poursuite && classification === impact.classification,
        )?.libelle_pitchou ?? null,
      nombreIndividus: impact.nombre_individus,
      nids: impact.nids,
      oeufs: impact.oeufs,
      surfaceHabitatDetruit: impact.surface_habitat_detruit,
    };
  });
}
