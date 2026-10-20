import { scientificTags } from "./generationTags/scientific.ts";
import { speciesTags } from "./generationTags/species.ts";
import { departementName } from "@pitchou/common/departements.ts";
import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
import { groupImpactsByTypeImpact } from "$lib/especes/groupImpactsByTypeImpact.ts";

import type { BalisesGenerationDocument } from "@pitchou/types/balisesGenerationDocument.d.ts";
import type { DossierFull, FrontEndImpactOnEspece } from "@pitchou/types/API_Pitchou.ts";
import type { EspecesByTypeImpact } from "$lib/especes/especesByTypeImpact.ts";
import { formatDocumentDate, formatNumber, formatSimpleDocumentDate } from "./tagFormatting.ts";

/**
 * List of tags provided to the instructeur.i.ces.
 *
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export function getDocumentGenerationTags(
  dossier: DossierFull,
  impacts: FrontEndImpactOnEspece[],
): BalisesGenerationDocument {
  const {
    name: dossierName,
    latestCommentaire: freeComment,
    public_consultation_start_date: publicConsultationStartDate,
    public_consultation_end_date: publicConsultationEndDate,
    description,
    depot_date: depotDate,
    departments,
    primary_department: primaryDepartment,
    enjeu,
    no_other_satisfactory_solution_justification: noOtherSatisfactorySolutionJustification,
    mesures_erc_planned: ercMesuresPlanned,
    motif_derogation: motifDerogation,
    motif_derogation_justification: motifDerogationJustification,
    intervention_start_date: interventionStartDate,
    intervention_end_date: interventionEndDate,
    commissioning_date: commissioningDate,
    intervention_duration: interventionDuration,
    onagre_demande_identifier: onagreDemandeIdentifier,
    main_activite: mainActivite,
    linked_to_ae_regime: linkedToAeRegime,
  } = dossier;

  // json column, so it may not be an array at runtime
  const departmentCodes: string[] | undefined = Array.isArray(departments)
    ? departments
    : undefined;
  const mainDepartmentCode: string | undefined = primaryDepartment ?? departmentCodes?.[0];

  // Transform the impacted especes if they exist. Left undefined rather than empty when there is
  // nothing to say: that is what a template testing the tag expects.
  const groupedEspecesByTypeImpact: EspecesByTypeImpact[] | undefined =
    impacts.length > 0 ? groupImpactsByTypeImpact(impacts) : undefined;

  const { hirondelleTags, cigogneTags } = birdTags(dossier);

  const porteurDeProjet = porteurTags(dossier);

  return {
    nom: dossierName,
    commentaire_instruction: freeComment?.trim() ?? "",
    date_début_consultation_public: publicConsultationStartDate,
    date_fin_consultation_public: publicConsultationEndDate,
    description,
    date_dépôt: depotDate,
    département_principal: mainDepartmentCode,
    nom_département_principal: mainDepartmentCode && departementName(mainDepartmentCode),
    liste_départements: departmentCodes,
    liste_noms_départements: departmentCodes?.map(departementName),
    enjeu,
    justification_absence_autre_solution_satisfaisante: noOtherSatisfactorySolutionJustification,
    mesures_erc_prévues: ercMesuresPlanned === null ? "Non renseigné" : ercMesuresPlanned,
    mesures_erc_prévues_renseigné: ercMesuresPlanned !== null,
    motif_dérogation: motifDerogation,
    hirondelles: hirondelleTags,
    cigognes: cigogneTags,
    justification_motif_dérogation: motifDerogationJustification,
    identifiant_onagre: onagreDemandeIdentifier,
    activité_principale: mainActivite,
    date_début_intervention: interventionStartDate,
    date_fin_intervention: interventionEndDate,
    date_mise_en_service: commissioningDate,
    durée_intervention: interventionDuration,
    porteur_de_projet: porteurDeProjet,
    // Former name of porteur_de_projet, kept for the existing templates.
    demandeur: porteurDeProjet,
    localisation: formatLocalisation(dossier),
    régime_autorisation_environnementale_renseigné: linkedToAeRegime !== null,
    régime_autorisation_environnementale:
      linkedToAeRegime === null ? "Non renseigné" : linkedToAeRegime,
    liste_espèces_par_impact: speciesTags(groupedEspecesByTypeImpact),
    scientifique: scientificTags(dossier),
    // Dossiers created directly in Pitchou have no DN number: fall back to the Pitchou id
    numéro_dossier: dossier.demarche_numerique_number ?? String(dossier.id),
    // deprecated
    identifiant_pitchou: dossier.id,
    //Functions
    afficher_nombre: formatNumber,
    formatter_date: formatDocumentDate,
    formatter_date_simple: formatSimpleDocumentDate,
  };
}

function porteurTags(dossier: DossierFull): BalisesGenerationDocument["porteur_de_projet"] {
  const porteur = dossier.porteur_de_projet;
  const porteurDeProjet: BalisesGenerationDocument["porteur_de_projet"] = {
    adresse: porteur?.address ?? "",
    nom:
      (porteur?.type === "personne_morale" && (porteur.legal_name || `SIRET ${porteur.siret}`)) ||
      (porteur?.type === "personne_physique" &&
        [porteur.first_names, porteur.last_name].filter(Boolean).join(" ")) ||
      "Non renseigné",
    toString() {
      return formatPorteurDeProjet(dossier);
    },
  };

  return porteurDeProjet;
}

function birdTags({
  type,
  dossier_oiseau_simple_compensated_nids_count: compensatedNidsCount,
  dossier_oiseau_simple_destroyed_nids_count: destroyedNidsCount,
}: DossierFull) {
  const hirondelleTags: BalisesGenerationDocument["hirondelles"] =
    type === "Hirondelle"
      ? {
          nids_détruits: destroyedNidsCount ?? null,
          nids_compensés: compensatedNidsCount ?? null,
        }
      : undefined;

  const cigogneTags: BalisesGenerationDocument["cigognes"] =
    type === "Cigogne"
      ? {
          nids_détruits: destroyedNidsCount ?? null,
          nids_compensés: compensatedNidsCount ?? null,
        }
      : undefined;

  return { hirondelleTags, cigogneTags };
}
