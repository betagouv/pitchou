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
  const interventionDuration = Number(
    champById.get(pitchouKeyToChampDS.get("Durée de la dérogation"))?.stringValue,
  );

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
  // "Non renseigné" is transformed into 'false'

  /** @type {DossierDemarcheNumerique88444['Description du protocole de suivi']} */
  const scientifiqueSuiviProtocolDescription = champById.get(
    pitchouKeyToChampDS.get("Description du protocole de suivi"),
  )?.stringValue;

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

  if (scientifiqueOtherCaptureMode) {
    scientifiqueCaptureModeSet.delete("Autre moyen de capture (préciser)");
    scientifiqueCaptureModeSet.add(scientifiqueOtherCaptureMode);
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
    intervention_start_date: interventionStartDate,
    intervention_end_date: interventionEndDate,
    commissioning_date: commissioningDate,
    intervention_duration: interventionDuration,

    no_other_satisfactory_solution_justification: noOtherSatisfactorySolutionJustification,
    motif_derogation: motifDerogation,
    motif_derogation_justification: motifDerogationJustification,

    // localisation
    // https://knexjs.org/guide/schema-builder.html#json
    communes: JSON.stringify(communes),
    departments: JSON.stringify(departments),
    regions: JSON.stringify(regions),
    // GeoJSON FeatureCollection stringified for the jsonb column (or null if no map champ)
    projet_map: projetMap,

    // régime AE
    linked_to_ae_regime: linkedToAeRegime,

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
    scientifique_suivi_protocol_description: scientifiqueSuiviProtocolDescription,
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    scientifique_capture_mode: scientifiqueCaptureMode,
    scientifique_light_source_conditions: scientifiqueLightSourceConditions,
    scientifique_marking_conditions: scientifiqueMarkingConditions,
    scientifique_transport_conditions: scientifiqueTransportConditions,
    scientifique_intervention_perimeter: scientifiqueInterventionPerimeter,
    scientifique_intervenants: JSON.stringify(scientifiqueIntervenants),
    scientifique_other_intervenants_details: scientifiqueOtherIntervenantsDetails,

    dossier_oiseau_simple_compensated_nids_count: compensatedNidsCount,
    dossier_oiseau_simple_destroyed_nids_count: destroyedNidsCount,

    type,
  };
}
