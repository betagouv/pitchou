import { departementName } from "@pitchou/common/departements.ts";
import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
import { createEspecesGroupedByImpact } from "$lib/especes/createEspecesGroupedByImpact.ts";

import type {
  ActiviteMenancante,
  DescriptionMenacesEspeces,
  QuantifiedImpact,
} from "@pitchou/types/especes.d.ts";
import type { BalisesGenerationDocument } from "@pitchou/types/balisesGenerationDocument.d.ts";
import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { EspecesByActivite } from "$lib/especes/createEspecesGroupedByImpact.ts";
import { formatDocumentDate, formatNumber, formatSimpleDocumentDate } from "./tagFormatting.ts";

/**
 * List of tags provided to the instructeur.i.ces.
 *
 * @see {@link https://betagouv.github.io/pitchou/instruction/document-types/creation.html}
 */
export function getDocumentGenerationTags(
  dossier: DossierFull,
  especesImpactees: DescriptionMenacesEspeces | undefined,
  identifiantPitchouVersActiviteEtImpactsQuantifies: Map<
    string,
    ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] }
  >,
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
    dossier_oiseau_simple_compensated_nids_count: compensatedNidsCount,
    dossier_oiseau_simple_destroyed_nids_count: destroyedNidsCount,
    motif_derogation_justification: motifDerogationJustification,
    intervention_start_date: interventionStartDate,
    intervention_end_date: interventionEndDate,
    commissioning_date: commissioningDate,
    intervention_duration: interventionDuration,
    onagre_demande_identifier: onagreDemandeIdentifier,
    main_activite: mainActivite,
    linked_to_ae_regime: linkedToAeRegime,
    type,
    scientifique_demande_type: scientifiqueDemandeType,
    scientifique_previous_assessment: scientifiquePreviousAssessment,
    scientifique_demande_purposes: scientifiqueDemandePurposes,
    scientifique_suivi_protocol_description: scientifiqueSuiviProtocolDescription,
    scientifique_capture_mode: scientifiqueCaptureMode,
    scientifique_light_source_conditions: scientifiqueLightSourceConditions,
    scientifique_marking_conditions: scientifiqueMarkingConditions,
    scientifique_transport_conditions: scientifiqueTransportConditions,
    scientifique_intervention_perimeter: scientifiqueInterventionPerimeter,
    scientifique_intervenants: scientifiqueIntervenants,
    scientifique_other_intervenants_details: scientifiqueOtherIntervenantsDetails,
  } = dossier;

  // json column, so it may not be an array at runtime
  const departmentCodes: string[] | undefined = Array.isArray(departments)
    ? departments
    : undefined;
  const mainDepartmentCode: string | undefined = primaryDepartment ?? departmentCodes?.[0];

  // Transform the impacted especes if they exist
  const groupedEspecesByImpact: EspecesByActivite[] | undefined = especesImpactees
    ? createEspecesGroupedByImpact(
        especesImpactees,
        identifiantPitchouVersActiviteEtImpactsQuantifies,
      )
    : undefined;

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
    demandeur: {
      adresse: dossier.demandeur_address,
      nom:
        dossier.demandeur_personne_morale_legal_name ||
        (dossier.demandeur_personne_morale_siret
          ? `SIRET ${dossier.demandeur_personne_morale_siret}`
          : null) ||
        [
          dossier.demandeur_personne_physique_first_names,
          dossier.demandeur_personne_physique_last_name,
        ]
          .filter(Boolean)
          .join(" ") ||
        dossier.demandeur_personne_physique_email ||
        dossier.deposant_email ||
        "Non renseigné",
      toString() {
        return formatPorteurDeProjet(dossier);
      },
    },
    localisation: formatLocalisation(dossier),
    régime_autorisation_environnementale_renseigné: linkedToAeRegime !== null,
    régime_autorisation_environnementale:
      linkedToAeRegime === null ? "Non renseigné" : linkedToAeRegime,
    liste_espèces_par_impact: groupedEspecesByImpact?.map(
      ({ espèces: especes, activité: activite, impactsQuantifiés: impactsQuantifies }) => ({
        liste_espèces: especes.map(
          ({
            nomVernaculaire,
            nomScientifique,
            détails,
            espèceCNPN: especeCNPN,
            espèceMinistérielle: especeMinisterielle,
          }) => ({
            nomVernaculaire,
            nomScientifique,
            liste_impacts_quantifiés: détails,
            estCNPN: especeCNPN,
            estMinistérielle: especeMinisterielle,
          }),
        ),
        impact: activite,
        liste_noms_impacts_quantifiés: impactsQuantifies,
      }),
    ),
    scientifique: {
      type_demande: scientifiqueDemandeType,
      bilan_antérieur: scientifiquePreviousAssessment,
      // @ts-expect-error json column, so type generation misunderstands it
      finalité_demande: scientifiqueDemandePurposes,
      description_protocole_suivi: scientifiqueSuiviProtocolDescription,
      mode_capture: scientifiqueCaptureMode,
      modalités_source_lumineuses: scientifiqueLightSourceConditions,
      modalités_marquage: scientifiqueMarkingConditions,
      modalités_transport: scientifiqueTransportConditions,
      périmètre_intervention: scientifiqueInterventionPerimeter,
      intervenants: scientifiqueIntervenants,
      précisions_autres_intervenants: scientifiqueOtherIntervenantsDetails,
    },
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
