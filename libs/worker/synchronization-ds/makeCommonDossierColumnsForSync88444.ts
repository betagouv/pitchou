import type {
  BaseChampDS,
  ChampDSCommunes,
  ChampDSDepartements,
  ChampDSRegions,
  ChampDSDepartement,
  ChampDSCarte,
  ChampScientifiqueIntervenants,
  DossierDS88444,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
import type { DossierInitializer, DossierMutator } from "@pitchou/types/database/public/Dossier.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import {
  eolienMortalityActionOptions,
  requiresScientificDemandeType,
  restaurationMainActivite,
  scientifiqueDemandeTypeOptions,
  transportMainActivites,
} from "@pitchou/common/dossierFormOptions.ts";

/**
 * Returns the dossier filled with the fields common to the DS dossiers from Démarche 88444 to initialize and to the DS dossiers to modify for the synchronization.
 */
export function makeCommonDossierColumnsForSync88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): DossierInitializer | DossierMutator {
  const { id: demarcheNumeriqueId, number, champs, annotations } = dossierDS;

  /**
   * Metadata
   */
  const demarcheNumeriqueNumber = String(number);

  /**
   * Fields
   */
  /** @type {Map<string | undefined, Champs88444>} */
  /** @type {Map<string | undefined, any>} */
  const champById = new Map();
  for (const champ of champs) {
    champById.set(champ.id, champ);
  }

  /** @type {DossierDemarcheNumerique88444["Nom du projet premettant de l'identifier clairement"]} */
  const name = champById.get(
    pitchouKeyToChampDS.get("Nom du projet premettant de l'identifier clairement"),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444['Description synthétique du projet']} */
  const description = champById.get(
    pitchouKeyToChampDS.get("Description synthétique du projet"),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444['Activité principale']} */
  const mainActivite = champById.get(pitchouKeyToChampDS.get("Activité principale"))?.stringValue;

  /** @type {DossierDemarcheNumerique88444['Date de début d’intervention']} */
  const interventionStartDate = champById.get(
    pitchouKeyToChampDS.get("Date de début d’intervention"),
  )?.date;
  /** @type {DossierDemarcheNumerique88444[‘Date de fin d’intervention’]} */
  const interventionEndDate = champById.get(
    pitchouKeyToChampDS.get("Date de fin d’intervention"),
  )?.date;
  /** @type {DossierDemarcheNumerique88444[‘Date de mise en service’]} */
  const commissioningDate = champById.get(pitchouKeyToChampDS.get("Date de mise en service"))?.date;
  /** @type {DossierDemarcheNumerique88444['Durée de la dérogation']} */
  const interventionDurationValue = champById.get(
    pitchouKeyToChampDS.get("Durée de la dérogation"),
  )?.stringValue;
  const parsedInterventionDuration = Number(interventionDurationValue);
  const interventionDuration =
    Number.isFinite(parsedInterventionDuration) && parsedInterventionDuration > 0
      ? parsedInterventionDuration
      : null;

  /** @type {DossierDemarcheNumerique88444[`Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`]} */
  const noOtherSatisfactorySolutionJustification = champById
    .get(
      pitchouKeyToChampDS.get(
        `Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`,
      ),
    )
    ?.stringValue.trim();
  /** @type {DossierDemarcheNumerique88444[`Motif de la dérogation`]} */
  const motifDerogation = champById.get(
    pitchouKeyToChampDS.get(`Motif de la dérogation`),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444[`Synthèse des éléments justifiant le motif de la dérogation`]} */
  const motifDerogationJustification = champById
    .get(pitchouKeyToChampDS.get(`Synthèse des éléments justifiant le motif de la dérogation`))
    ?.stringValue.trim();

  /* localisation */
  /** @type {DossierDemarcheNumerique88444['Le projet se situe au niveau…'] | ''} */
  const projetSitue = champById.get(
    pitchouKeyToChampDS.get("Le projet se situe au niveau…"),
  )?.stringValue;
  const locationScope =
    projetSitue === `d'une ou plusieurs communes`
      ? "communes"
      : projetSitue === `d'un ou plusieurs départements`
        ? "departements"
        : projetSitue === `d'une ou plusieurs régions`
          ? "regions"
          : projetSitue === "de toute la France"
            ? "france"
            : null;
  const champCommunes: ChampDSCommunes = champById.get(
    pitchouKeyToChampDS.get("Commune(s) où se situe le projet"),
  );
  const champDepartements: ChampDSDepartements = champById.get(
    pitchouKeyToChampDS.get("Département(s) où se situe le projet"),
  );
  const champDepartementPrincipal: ChampDSDepartement = champById.get(
    pitchouKeyToChampDS.get("Dans quel département se localise majoritairement votre projet ?"),
  );
  const champRegions: ChampDSRegions = champById.get(
    pitchouKeyToChampDS.get("Région(s) où se situe le projet"),
  );

  /** @type {DémarchesSimpliféesCommune[] | undefined} */
  let communes;

  /** @type {DémarchesSimpliféesDépartement['code'][] | undefined} */
  let departments;
  let regions;

  if (projetSitue === `d'une ou plusieurs communes` && champCommunes) {
    communes = champCommunes.rows.map((c) => c.champs[0].commune).filter((x) => !!x);

    if (Array.isArray(communes) && communes.length >= 1) {
      departments = [
        ...new Set(champCommunes.rows.map((c) => c.champs[0].departement?.code).filter((x) => !!x)),
      ];
    }
  } else {
    if (projetSitue === `d'un ou plusieurs départements` && champDepartements) {
      departments = [
        ...new Set(champDepartements.rows.map((c) => c.champs[0].departement?.code)),
      ].filter((x) => !!x);
    } else {
      if (projetSitue === `d'une ou plusieurs régions` && champRegions) {
        regions = [...new Set(champRegions.rows.map((c) => c.champs[0].stringValue))];
      } else {
        if (projetSitue === "de toute la France") {
          // ignore
        } else {
          if (!projetSitue) {
            // ignore
          } else {
            console.log("localisation manquante", projetSitue, champs);
            process.exit(1);
          }
        }
      }
    }
  }

  // If localisation via the dedicated fields (especially communes and departements) failed,
  // fall back to the main departement field if it is present.
  if (
    champDepartementPrincipal &&
    champDepartementPrincipal.departement &&
    (!departments || departments.length === 0)
  ) {
    departments = [champDepartementPrincipal.departement.code];
  }

  /** Régime AE */
  // the AE field changed from a checkbox to a Yes/No to a Yes/No/Don't know yet
  // and so we handle the different values for the different versions of the form

  const linkedToAeRegimeChamp = champById.get(
    pitchouKeyToChampDS.get(
      "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?",
    ),
  );

  const linkedToAeRegimeValue = linkedToAeRegimeChamp?.stringValue;

  // null means "don't know yet" and it is the default value
  let linkedToAeRegime = null;

  if (linkedToAeRegimeValue === "Oui" || linkedToAeRegimeValue === "true") {
    linkedToAeRegime = true;
  }
  if (linkedToAeRegimeValue === "Non" || linkedToAeRegimeValue === "false") {
    linkedToAeRegime = false;
  }
  const aeProcedures = champById.get(
    pitchouKeyToChampDS.get("À quelle procédure le projet est-il soumis ?"),
  )?.values;

  /** Mesures ERC planned */
  const ercMesuresPlannedChamp = champById.get(
    pitchouKeyToChampDS.get("Des mesures ERC sont-elles prévues ?"),
  );
  const ercMesuresPlanned = ercMesuresPlannedChamp?.checked;

  const ecologicalInventoryCompletedChamp = champById.get(
    pitchouKeyToChampDS.get("Avez-vous réalisé un état des lieux écologique complet ?"),
  );
  const ecologicalInventoryCompleted = ecologicalInventoryCompletedChamp?.checked;

  const especesPresentInInfluenceAreaChamp = champById.get(
    pitchouKeyToChampDS.get(
      "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?",
    ),
  );
  const especesPresentInInfluenceArea = especesPresentInInfluenceAreaChamp?.checked;

  const riskDespiteErcMesuresChamp = champById.get(
    pitchouKeyToChampDS.get(
      "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?",
    ),
  );

  const riskDespiteErcMesures = riskDespiteErcMesuresChamp?.checked;

  /** Scientific dossier data */
  /** @type {DossierDemarcheNumerique88444['Recherche scientifique - Votre demande concerne :']} */
  const scientifiqueDemandeTypeValues = champById.get(
    pitchouKeyToChampDS.get("Recherche scientifique - Votre demande concerne :"),
  )?.values;

  /** @type {DossierDemarcheNumerique88444['Captures/Relâchers/Prélèvement - Finalité(s) de la demande']} */
  const scientifiqueDemandePurposes = champById.get(
    pitchouKeyToChampDS.get("Captures/Relâchers/Prélèvement - Finalité(s) de la demande"),
  )?.values;

  /** @type {DossierDemarcheNumerique88444['Cette demande concerne un programme de suivi déjà existant']} */
  const scientifiquePreviousAssessment = champById.get(
    pitchouKeyToChampDS.get("Cette demande concerne un programme de suivi déjà existant"),
  )?.checked;
  const limitedSpecimenType = champById.get(
    pitchouKeyToChampDS.get("Prise ou détention limité ou spécifié - Précisez"),
  )?.stringValue;
  const scientifiqueMortalityMeasuresTaken = champById.get(
    pitchouKeyToChampDS.get(
      "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?",
    ),
  )?.checked;
  const scientifiqueMortalityMeasuresDetails = champById.get(
    pitchouKeyToChampDS.get("Précisez ces mesures :"),
  )?.stringValue;
  const numberChamp = (label: keyof DossierDemarcheNumerique88444) => {
    const value = Number(champById.get(pitchouKeyToChampDS.get(label))?.stringValue);
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const eolienCommissioningYear = numberChamp("Année de mise en service");
  const eolienTurbinesCount = numberChamp("Nombre d'éoliennes");
  const eolienTipHeight = numberChamp("Hauteur totale bout de pale (m)");
  const eolienRotorDiameter = numberChamp("Diamètre du rotor (m)");
  const eolienGroundClearance = numberChamp("Garde au sol (m)");
  // "Non renseigné" is transformed into 'false'

  /** @type {DossierDemarcheNumerique88444['Description du protocole de suivi']} */
  const scientifiqueSuiviProtocolDescription = champById.get(
    pitchouKeyToChampDS.get("Description du protocole de suivi"),
  )?.stringValue;
  const eolienMonitoredTurbinesCountValue = champById.get(
    pitchouKeyToChampDS.get("Nombre d'éoliennes à suivre"),
  )?.stringValue;
  const eolienMonitoredTurbinesCount = Number(eolienMonitoredTurbinesCountValue);
  const eolienFieldInventoryPeriod = champById.get(
    pitchouKeyToChampDS.get("Période des inventaires terrain"),
  )?.stringValue;
  const eolienMonitoringVisitsCountValue = champById.get(
    pitchouKeyToChampDS.get("Nombre de passages pendant le suivi"),
  )?.stringValue;
  const eolienMonitoringVisitsCount = Number(eolienMonitoringVisitsCountValue);
  const eolienWeeklyMonitoringVisitsCountValue = champById.get(
    pitchouKeyToChampDS.get("Nombre de passages par semaine de suivi"),
  )?.stringValue;
  const eolienWeeklyMonitoringVisitsCount = Number(eolienWeeklyMonitoringVisitsCountValue);
  const eolienMortalityActions = champById.get(
    pitchouKeyToChampDS.get("Suivi de mortalité - Votre demande concerne :"),
  )?.values;
  const windMortality =
    mainActivite === "Production énergie renouvelable - Éolien -  Suivi mortalité";
  const showsOperationDetails = requiresScientificDemandeType(motifDerogation) || windMortality;
  const validEolienMortalityActions = (eolienMortalityActions ?? []).filter((value: string) =>
    eolienMortalityActionOptions.includes(value as never),
  );
  const showsCarcassAnalysis =
    windMortality && validEolienMortalityActions.includes(eolienMortalityActionOptions[1]);
  const eolienCarcassCollectionMethod = champById.get(
    pitchouKeyToChampDS.get("Description du mode de collecte sur le terrain"),
  )?.stringValue;
  const eolienCarcassPreservationMethod = champById.get(
    pitchouKeyToChampDS.get("Méthode de conservation"),
  )?.stringValue;
  const eolienCarcassExaminationAddress = champById.get(
    pitchouKeyToChampDS.get("Adresse des locaux où seront examinés les cadavres"),
  )?.stringValue;
  const showsScientificCaptureDetails =
    requiresScientificDemandeType(motifDerogation) &&
    (scientifiqueDemandeTypeValues ?? []).some((value: string) =>
      scientifiqueDemandeTypeOptions.slice(0, 3).includes(value as never),
    );

  /** @type {DossierDemarcheNumerique88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`][]} */
  const scientifiqueCaptureModeValues = champById.get(
    pitchouKeyToChampDS.get(
      `En cas de nécessité de capture d'individus, précisez le mode de capture`,
    ),
  )?.values;

  /** @type {DossierDemarcheNumerique88444[`Préciser le(s) autre(s) moyen(s) de capture`]} */
  const scientifiqueOtherCaptureMode = champById.get(
    pitchouKeyToChampDS.get(`Préciser le(s) autre(s) moyen(s) de capture`),
  )?.stringValue;

  /** @type {Set<DossierDemarcheNumerique88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`] | DossierDemarcheNumerique88444[`Préciser le(s) autre(s) moyen(s) de capture`]>} */
  const scientifiqueCaptureModeSet = scientifiqueCaptureModeValues
    ? new Set(scientifiqueCaptureModeValues)
    : new Set();

  scientifiqueCaptureModeSet.delete("Autre moyen de capture (préciser)");
  if (scientifiqueOtherCaptureMode?.trim()) {
    scientifiqueCaptureModeSet.add(scientifiqueOtherCaptureMode.trim());
  }

  const scientifiqueCaptureMode = JSON.stringify([...scientifiqueCaptureModeSet]);

  /** @type {DossierDemarcheNumerique88444[`Utilisez-vous des sources lumineuses ?`]} */
  const scientifiqueLightSourceConditionsEnabled = champById.get(
    pitchouKeyToChampDS.get(`Utilisez-vous des sources lumineuses ?`),
  )?.checked;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de l'utilisation des sources lumineuses`]} */
  const scientifiqueLightSourceConditionsDetails = champById.get(
    pitchouKeyToChampDS.get(`Précisez les modalités de l'utilisation des sources lumineuses`),
  )?.stringValue;

  const scientifiqueLightSourceConditions =
    scientifiqueLightSourceConditionsEnabled && scientifiqueLightSourceConditionsDetails
      ? scientifiqueLightSourceConditionsDetails
      : undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de marquage pour chaque taxon`]} */
  const scientifiqueMarkingConditions =
    champById.get(pitchouKeyToChampDS.get(`Précisez les modalités de marquage pour chaque taxon`))
      ?.stringValue || undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`]} */
  const scientifiqueTransportConditions =
    champById.get(
      pitchouKeyToChampDS.get(
        `Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`,
      ),
    )?.stringValue || undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez le périmètre d'intervention`]} */
  const scientifiqueInterventionPerimeter =
    champById.get(pitchouKeyToChampDS.get(`Précisez le périmètre d'intervention`))?.stringValue ||
    undefined;

  const scientifiqueIntervenantQualifications: ChampScientifiqueIntervenants | undefined =
    champById.get(pitchouKeyToChampDS.get(`Qualification des intervenants`)) || undefined;

  let rowsChamp: BaseChampDS[][] | undefined =
    scientifiqueIntervenantQualifications &&
    scientifiqueIntervenantQualifications.rows.map((r) => r.champs);

  /** @type { {nom_complet?: string, qualification?: string}[] | undefined} */
  let scientifiqueIntervenants = undefined;

  if (Array.isArray(rowsChamp)) {
    scientifiqueIntervenants = rowsChamp.map((champs) => {
      const champNomComplet = champs.find((c) => c.label === "Nom Prénom");
      const champQualification = champs.find((c) => c.label === "Qualification");

      return {
        nom_complet: champNomComplet && champNomComplet.stringValue,
        qualification: champQualification && champQualification.stringValue,
      };
    });
  }

  /** @type {DossierDemarcheNumerique88444[`Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`]} */
  const scientifiqueOtherIntervenantsDetails =
    champById.get(
      pitchouKeyToChampDS.get(
        `Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`,
      ),
    )?.stringValue || undefined;

  /**
   * Private annotations
   */
  /** @type {Map<string | undefined, Annotations88444>} */
  /** @type {Map<string | undefined, any>} */
  const annotationById = new Map();
  for (const annotation of annotations) {
    annotationById.set(annotation.id, annotation);
  }

  const compensatedNidsCountValue = champById.get(
    pitchouKeyToChampDS.get("Indiquer le nombre de nids artificiels posés en compensation"),
  )?.stringValue;
  const compensatedNidsCount = compensatedNidsCountValue ? Number(compensatedNidsCountValue) : null;

  const destroyedNidsCountValue = champById.get(
    pitchouKeyToChampDS.get("Nombre de nids d'Hirondelles détruits"),
  )?.stringValue;
  const destroyedNidsCount = destroyedNidsCountValue ? Number(destroyedNidsCountValue) : null;

  const railOrElectricTransportChamp = champById.get(
    pitchouKeyToChampDS.get("Transport ferroviaire ou électrique - Votre demande concerne :"),
  )?.stringValue;

  /**
   * Project map (CarteChamp)
   *
   * Identify the map champ(s) robustly (independently of the label) via the presence of
   * `geoAreas`, and build a GeoJSON FeatureCollection that is directly downloadable and
   * loadable as a MapLibre source.
   */
  const carteChamps = champs.filter((c): c is ChampDSCarte =>
    Array.isArray((c as ChampDSCarte).geoAreas),
  );
  const features = carteChamps.flatMap((c) =>
    c.geoAreas.map((a) => ({
      type: "Feature",
      geometry: a.geometry,
      properties: { source: a.source, description: a.description ?? null },
    })),
  );
  const projetMap = features.length
    ? JSON.stringify({ type: "FeatureCollection", features })
    : null;

  /** @type {TypeDossier | null} */
  const type = destroyedNidsCountValue
    ? "Hirondelle"
    : railOrElectricTransportChamp === "Destruction de nids de Cigognes"
      ? "Cigogne"
      : null;
  const requiresCompensatedNidsCount =
    (mainActivite === restaurationMainActivite && type === "Hirondelle") ||
    (transportMainActivites.includes(mainActivite as never) && type === "Cigogne");

  return {
    // metadata
    demarche_numerique_id: demarcheNumeriqueId,
    demarche_numerique_number: demarcheNumeriqueNumber,

    // demandeur_personne_physique,
    // demandeur_personne_morale,
    // deposant,

    // fields
    ecological_inventory_completed: ecologicalInventoryCompleted,
    especes_present_in_influence_area: especesPresentInInfluenceArea,
    risk_despite_erc_mesures: riskDespiteErcMesures,

    name,
    description,
    main_activite: mainActivite,
    intervention_start_date: interventionStartDate ?? null,
    intervention_end_date: interventionEndDate ?? null,
    commissioning_date: commissioningDate ?? null,
    intervention_duration: interventionDuration,

    no_other_satisfactory_solution_justification: noOtherSatisfactorySolutionJustification,
    motif_derogation: motifDerogation,
    motif_derogation_justification: motifDerogationJustification,

    // localisation
    // https://knexjs.org/guide/schema-builder.html#json
    communes: JSON.stringify(communes),
    departments: JSON.stringify(departments),
    regions: JSON.stringify(regions),
    location_scope: locationScope,
    primary_department: champDepartementPrincipal?.departement?.code,
    // GeoJSON FeatureCollection stringified for the jsonb column (or null if no map champ)
    projet_map: projetMap,

    // régime AE
    linked_to_ae_regime: linkedToAeRegime,
    ae_procedures: aeProcedures ? JSON.stringify(aeProcedures) : null,
    ae_other_procedure: null,

    // mesures ERC planned
    mesures_erc_planned: ercMesuresPlanned,

    /**
     * The scientific dossier data
     */
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    scientifique_demande_type: scientifiqueDemandeTypeValues
      ? JSON.stringify(scientifiqueDemandeTypeValues)
      : undefined,
    scientifique_demande_purposes: scientifiqueDemandePurposes
      ? JSON.stringify(scientifiqueDemandePurposes)
      : undefined,
    scientifique_previous_assessment: scientifiquePreviousAssessment,
    limited_specimen_type: limitedSpecimenType || null,
    scientifique_mortality_measures_taken: scientifiqueMortalityMeasuresTaken ?? null,
    scientifique_mortality_measures_details: scientifiqueMortalityMeasuresDetails || null,
    eolien_commissioning_year: eolienCommissioningYear,
    eolien_turbines_count: eolienTurbinesCount,
    eolien_tip_height: eolienTipHeight,
    eolien_rotor_diameter: eolienRotorDiameter,
    eolien_ground_clearance: eolienGroundClearance,
    scientifique_suivi_protocol_description: showsOperationDetails
      ? scientifiqueSuiviProtocolDescription || null
      : null,
    eolien_monitored_turbines_count:
      windMortality &&
      Number.isInteger(eolienMonitoredTurbinesCount) &&
      eolienMonitoredTurbinesCount > 0
        ? eolienMonitoredTurbinesCount
        : null,
    eolien_field_inventory_period: windMortality ? eolienFieldInventoryPeriod || null : null,
    eolien_monitoring_visits_count:
      windMortality &&
      Number.isInteger(eolienMonitoringVisitsCount) &&
      eolienMonitoringVisitsCount > 0
        ? eolienMonitoringVisitsCount
        : null,
    eolien_weekly_monitoring_visits_count:
      windMortality &&
      Number.isInteger(eolienWeeklyMonitoringVisitsCount) &&
      eolienWeeklyMonitoringVisitsCount > 0
        ? eolienWeeklyMonitoringVisitsCount
        : null,
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    eolien_mortality_actions:
      windMortality && validEolienMortalityActions.length >= 1
        ? JSON.stringify(validEolienMortalityActions)
        : null,
    eolien_carcass_collection_method: showsCarcassAnalysis
      ? eolienCarcassCollectionMethod || null
      : null,
    eolien_carcass_preservation_method: showsCarcassAnalysis
      ? eolienCarcassPreservationMethod || null
      : null,
    eolien_carcass_examination_address: showsCarcassAnalysis
      ? eolienCarcassExaminationAddress || null
      : null,
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    scientifique_capture_mode: showsScientificCaptureDetails ? scientifiqueCaptureMode : null,
    scientifique_light_source_conditions: showsScientificCaptureDetails
      ? (scientifiqueLightSourceConditions ?? null)
      : null,
    scientifique_marking_conditions:
      showsScientificCaptureDetails &&
      (scientifiqueDemandeTypeValues ?? []).includes(scientifiqueDemandeTypeOptions[1])
        ? (scientifiqueMarkingConditions ?? null)
        : null,
    scientifique_transport_conditions:
      showsScientificCaptureDetails &&
      (scientifiqueDemandeTypeValues ?? []).includes(scientifiqueDemandeTypeOptions[2])
        ? (scientifiqueTransportConditions ?? null)
        : null,
    scientifique_intervention_perimeter: scientifiqueInterventionPerimeter,
    scientifique_intervenants:
      showsOperationDetails && scientifiqueIntervenants
        ? JSON.stringify(scientifiqueIntervenants)
        : null,
    scientifique_other_intervenants_details: showsOperationDetails
      ? scientifiqueOtherIntervenantsDetails || null
      : null,

    dossier_oiseau_simple_compensated_nids_count: requiresCompensatedNidsCount
      ? compensatedNidsCount
      : null,
    dossier_oiseau_simple_destroyed_nids_count: destroyedNidsCount,

    type,
  };
}
