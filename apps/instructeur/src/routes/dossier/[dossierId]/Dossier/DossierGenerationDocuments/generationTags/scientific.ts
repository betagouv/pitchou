import type { DossierFull } from "@pitchou/types/API_Pitchou.ts";
import type { BalisesGenerationDocument } from "@pitchou/types/balisesGenerationDocument.d.ts";
export function scientificTags(dossier: DossierFull): BalisesGenerationDocument["scientifique"] {
  const {
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
  return {
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
  };
}
