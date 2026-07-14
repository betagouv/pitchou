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
export function makeColonnesCommunesDossierPourSynchro88444(
  dossierDS: DossierDS88444,
  pitchouKeyToChampDS: Map<keyof DossierDemarcheNumerique88444, ChampDescriptor["id"]>,
): DossierInitializer | DossierMutator {
  const { id: id_demarches_simplifiées, number, champs, annotations } = dossierDS;

  /**
   * Metadata
   */
  const number_demarches_simplifiées = String(number);

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
  const nom = champById.get(
    pitchouKeyToChampDS.get("Nom du projet premettant de l'identifier clairement"),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444['Description synthétique du projet']} */
  const description = champById.get(
    pitchouKeyToChampDS.get("Description synthétique du projet"),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444['Activité principale']} */
  const activité_principale = champById.get(
    pitchouKeyToChampDS.get("Activité principale"),
  )?.stringValue;

  /** @type {DossierDemarcheNumerique88444['Date de début d’intervention']} */
  const date_début_intervention = champById.get(
    pitchouKeyToChampDS.get("Date de début d’intervention"),
  )?.date;
  /** @type {DossierDemarcheNumerique88444[‘Date de fin d’intervention’]} */
  const date_fin_intervention = champById.get(
    pitchouKeyToChampDS.get("Date de fin d’intervention"),
  )?.date;
  /** @type {DossierDemarcheNumerique88444[‘Date de mise en service’]} */
  const date_mise_en_service = champById.get(
    pitchouKeyToChampDS.get("Date de mise en service"),
  )?.date;
  /** @type {DossierDemarcheNumerique88444['Durée de la dérogation']} */
  const durée_intervention = Number(
    champById.get(pitchouKeyToChampDS.get("Durée de la dérogation"))?.stringValue,
  );

  /** @type {DossierDemarcheNumerique88444[`Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`]} */
  const justification_absence_autre_solution_satisfaisante = champById
    .get(
      pitchouKeyToChampDS.get(
        `Synthèse des éléments démontrant qu'il n'existe aucune alternative au projet`,
      ),
    )
    ?.stringValue.trim();
  /** @type {DossierDemarcheNumerique88444[`Motif de la dérogation`]} */
  const motif_dérogation = champById.get(
    pitchouKeyToChampDS.get(`Motif de la dérogation`),
  )?.stringValue;
  /** @type {DossierDemarcheNumerique88444[`Synthèse des éléments justifiant le motif de la dérogation`]} */
  const justification_motif_dérogation = champById
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
  let départements;
  let régions;

  if (projetSitue === `d'une ou plusieurs communes` && champCommunes) {
    communes = champCommunes.rows.map((c) => c.champs[0].commune).filter((x) => !!x);

    if (Array.isArray(communes) && communes.length >= 1) {
      départements = [
        ...new Set(champCommunes.rows.map((c) => c.champs[0].departement?.code).filter((x) => !!x)),
      ];
    }
  } else {
    if (projetSitue === `d'un ou plusieurs départements` && champDepartements) {
      départements = [
        ...new Set(champDepartements.rows.map((c) => c.champs[0].departement?.code)),
      ].filter((x) => !!x);
    } else {
      if (projetSitue === `d'une ou plusieurs régions` && champRegions) {
        régions = [...new Set(champRegions.rows.map((c) => c.champs[0].stringValue))];
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

  // If localisation via the dedicated fields (especially communes and départements) failed,
  // fall back to the main département field if it is present
  if (
    champDepartementPrincipal &&
    champDepartementPrincipal.departement &&
    (!départements || départements.length === 0)
  ) {
    départements = [champDepartementPrincipal.departement.code];
  }

  /** Régime AE */
  // the AE field changed from a checkbox to a Yes/No to a Yes/No/Don't know yet
  // and so we handle the different values for the different versions of the form

  const rattache_regime_ae_champ = champById.get(
    pitchouKeyToChampDS.get(
      "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?",
    ),
  );

  const rattache_au_regime_ae_stringValue = rattache_regime_ae_champ?.stringValue;

  // null means "don't know yet" and it is the default value
  let rattaché_au_régime_ae = null;

  if (rattache_au_regime_ae_stringValue === "Oui" || rattache_au_regime_ae_stringValue === "true") {
    rattaché_au_régime_ae = true;
  }
  if (
    rattache_au_regime_ae_stringValue === "Non" ||
    rattache_au_regime_ae_stringValue === "false"
  ) {
    rattaché_au_régime_ae = false;
  }

  /** Mesures ERC planned */
  const mesures_erc_prevues_champ = champById.get(
    pitchouKeyToChampDS.get("Des mesures ERC sont-elles prévues ?"),
  );
  const mesures_erc_prévues = mesures_erc_prevues_champ?.checked;

  const etat_des_lieux_ecologique_complet_realise_champ = champById.get(
    pitchouKeyToChampDS.get("Avez-vous réalisé un état des lieux écologique complet ?"),
  );
  const etat_des_lieux_ecologique_complet_realise =
    etat_des_lieux_ecologique_complet_realise_champ?.checked;

  const presence_especes_dans_aire_influence_champ = champById.get(
    pitchouKeyToChampDS.get(
      "Des spécimens ou habitats d'espèces protégées sont-ils présents dans l'aire d'influence de votre projet ?",
    ),
  );
  const presence_especes_dans_aire_influence = presence_especes_dans_aire_influence_champ?.checked;

  const risque_malgre_mesures_erc_champ = champById.get(
    pitchouKeyToChampDS.get(
      "Après mises en oeuvre de mesures d'évitement et de réduction, un risque suffisamment caractérisé pour les espèces protégées demeure-t-il ?",
    ),
  );

  const risque_malgre_mesures_erc = risque_malgre_mesures_erc_champ?.checked;

  /** Scientific dossier data */
  /** @type {DossierDemarcheNumerique88444['Recherche scientifique - Votre demande concerne :']} */
  const scientifique_type_demande_values = champById.get(
    pitchouKeyToChampDS.get("Recherche scientifique - Votre demande concerne :"),
  )?.values;

  /** @type {DossierDemarcheNumerique88444['Captures/Relâchers/Prélèvement - Finalité(s) de la demande']} */
  const scientifique_finalité_demande = champById.get(
    pitchouKeyToChampDS.get("Captures/Relâchers/Prélèvement - Finalité(s) de la demande"),
  )?.values;

  /** @type {DossierDemarcheNumerique88444['Cette demande concerne un programme de suivi déjà existant']} */
  const scientifique_bilan_antérieur = champById.get(
    pitchouKeyToChampDS.get("Cette demande concerne un programme de suivi déjà existant"),
  )?.checked;
  // "Non renseigné" is transformed into 'false'

  /** @type {DossierDemarcheNumerique88444['Description du protocole de suivi']} */
  const scientifique_description_protocole_suivi = champById.get(
    pitchouKeyToChampDS.get("Description du protocole de suivi"),
  )?.stringValue;

  /** @type {DossierDemarcheNumerique88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`][]} */
  const scientifique_precisez_mode_capture_values = champById.get(
    pitchouKeyToChampDS.get(
      `En cas de nécessité de capture d'individus, précisez le mode de capture`,
    ),
  )?.values;

  /** @type {DossierDemarcheNumerique88444[`Préciser le(s) autre(s) moyen(s) de capture`]} */
  const scientifique_precisez_autre_capture = champById.get(
    pitchouKeyToChampDS.get(`Préciser le(s) autre(s) moyen(s) de capture`),
  )?.stringValue;

  /** @type {Set<DossierDemarcheNumerique88444[`En cas de nécessité de capture d'individus, précisez le mode de capture`] | DossierDemarcheNumerique88444[`Préciser le(s) autre(s) moyen(s) de capture`]>} */
  const scientifique_mode_capture_set = scientifique_precisez_mode_capture_values
    ? new Set(scientifique_precisez_mode_capture_values)
    : new Set();

  if (scientifique_precisez_autre_capture) {
    scientifique_mode_capture_set.delete("Autre moyen de capture (préciser)");
    scientifique_mode_capture_set.add(scientifique_precisez_autre_capture);
  }

  const scientifique_mode_capture = JSON.stringify([...scientifique_mode_capture_set]);

  /** @type {DossierDemarcheNumerique88444[`Utilisez-vous des sources lumineuses ?`]} */
  const scientifique_modalites_source_lumineuses_boolean = champById.get(
    pitchouKeyToChampDS.get(`Utilisez-vous des sources lumineuses ?`),
  )?.checked;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de l'utilisation des sources lumineuses`]} */
  const scientifique_modalites_source_lumineuses_precisez = champById.get(
    pitchouKeyToChampDS.get(`Précisez les modalités de l'utilisation des sources lumineuses`),
  )?.stringValue;

  const scientifique_modalités_source_lumineuses =
    scientifique_modalites_source_lumineuses_boolean &&
    scientifique_modalites_source_lumineuses_precisez
      ? scientifique_modalites_source_lumineuses_precisez
      : undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de marquage pour chaque taxon`]} */
  const scientifique_modalités_marquage =
    champById.get(pitchouKeyToChampDS.get(`Précisez les modalités de marquage pour chaque taxon`))
      ?.stringValue || undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`]} */
  const scientifique_modalités_transport =
    champById.get(
      pitchouKeyToChampDS.get(
        `Précisez les modalités de transport et la destination concernant la collecte de matériel biologique`,
      ),
    )?.stringValue || undefined;

  /** @type {DossierDemarcheNumerique88444[`Précisez le périmètre d'intervention`]} */
  const scientifique_périmètre_intervention =
    champById.get(pitchouKeyToChampDS.get(`Précisez le périmètre d'intervention`))?.stringValue ||
    undefined;

  let scientifique_qualifications_intervenants: ChampScientifiqueIntervenants | undefined =
    champById.get(pitchouKeyToChampDS.get(`Qualification des intervenants`)) || undefined;

  let rowsChamp: BaseChampDS[][] | undefined =
    scientifique_qualifications_intervenants &&
    scientifique_qualifications_intervenants.rows.map((r) => r.champs);

  /** @type { {nom_complet?: string, qualification?: string}[] | undefined} */
  let scientifique_intervenants = undefined;

  if (Array.isArray(rowsChamp)) {
    scientifique_intervenants = rowsChamp.map((champs) => {
      const champNomComplet = champs.find((c) => c.label === "Nom Prénom");
      const champQualification = champs.find((c) => c.label === "Qualification");

      return {
        nom_complet: champNomComplet && champNomComplet.stringValue,
        qualification: champQualification && champQualification.stringValue,
      };
    });
  }

  /** @type {DossierDemarcheNumerique88444[`Apporter des précisions complémentaires sur la possible intervention de stagiaire(s)/vacataire(s)/bénévole(s)`]} */
  const scientifique_précisions_autres_intervenants =
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

  const champ_nombre_nids_compenses_oiseau_simple = champById.get(
    pitchouKeyToChampDS.get("Indiquer le nombre de nids artificiels posés en compensation"),
  )?.stringValue;
  const nombre_nids_compensés_dossier_oiseau_simple = champ_nombre_nids_compenses_oiseau_simple
    ? Number(champ_nombre_nids_compenses_oiseau_simple)
    : null;

  const champ_nombre_nids_detruits_oiseau_simple_hirondelle = champById.get(
    pitchouKeyToChampDS.get("Nombre de nids d'Hirondelles détruits"),
  )?.stringValue;
  const nombre_nids_détruits_dossier_oiseau_simple =
    champ_nombre_nids_detruits_oiseau_simple_hirondelle
      ? Number(champ_nombre_nids_detruits_oiseau_simple_hirondelle)
      : null;

  const champ_transport_ferroviaire_electrique = champById.get(
    pitchouKeyToChampDS.get("Transport ferroviaire ou électrique - Votre demande concerne :"),
  )?.stringValue;

  /**
   * cartographie_projet (CarteChamp)
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
  const cartographie_projet = features.length
    ? JSON.stringify({ type: "FeatureCollection", features })
    : null;

  /** @type {TypeDossier | null} */
  const type = champ_nombre_nids_detruits_oiseau_simple_hirondelle
    ? "Hirondelle"
    : champ_transport_ferroviaire_electrique === "Destruction de nids de Cigognes"
      ? "Cigogne"
      : null;

  return {
    // metadata
    id_demarches_simplifiées,
    number_demarches_simplifiées,

    // demandeur_personne_physique,
    // demandeur_personne_morale,
    // déposant,

    // fields
    etat_des_lieux_ecologique_complet_realise,
    presence_especes_dans_aire_influence,
    risque_malgre_mesures_erc,

    nom,
    description,
    activité_principale,
    date_début_intervention,
    date_fin_intervention,
    date_mise_en_service,
    durée_intervention,

    justification_absence_autre_solution_satisfaisante,
    motif_dérogation,
    justification_motif_dérogation,

    // localisation
    // https://knexjs.org/guide/schema-builder.html#json
    communes: JSON.stringify(communes),
    départements: JSON.stringify(départements),
    régions: JSON.stringify(régions),
    // GeoJSON FeatureCollection stringified for the jsonb column (or null if no map champ)
    cartographie_projet,

    // régime AE
    rattaché_au_régime_ae,

    // mesures ERC planned
    mesures_erc_prévues,

    /**
     * The scientific dossier data
     */
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    scientifique_type_demande: scientifique_type_demande_values
      ? JSON.stringify(scientifique_type_demande_values)
      : undefined,
    scientifique_finalité_demande: scientifique_finalité_demande
      ? JSON.stringify(scientifique_finalité_demande)
      : undefined,
    scientifique_bilan_antérieur,
    scientifique_description_protocole_suivi,
    //@ts-ignore Columns of database type 'json' are inserted as a string after a JSON.stringify
    scientifique_mode_capture,
    scientifique_modalités_source_lumineuses,
    scientifique_modalités_marquage,
    scientifique_modalités_transport,
    scientifique_périmètre_intervention,
    scientifique_intervenants: JSON.stringify(scientifique_intervenants),
    scientifique_précisions_autres_intervenants,

    nombre_nids_compensés_dossier_oiseau_simple,
    nombre_nids_détruits_dossier_oiseau_simple,

    type,
  };
}
