import type { SeedDossier } from "./types.ts";
import { cartographie, ligne, zoneCarree } from "./cartographie.ts";

export const SEED_DOSSIERS_CHUNK_5: SeedDossier[] = [
  // -------------------------------------------------------------------------
  // D6 — Déviation de la RD 73 – DREAL Normandie
  // Phase actuelle : Instruction (en attente avis CNPN)
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000006",
    groupe_instructeur: "DREAL Normandie",
    demandeur_personne_morale: "22760540400019",
    representative_email: "elodie.vasseur@seinemaritime.example",
    depot_date: new Date("2023-05-22T13:45:00+00:00"),
    departments: ["76"],
    communes: [
      { name: "Yvetot", code: "76759", postalCode: "76190" },
      { name: "Valliquerville", code: "76726", postalCode: "76190" },
    ],
    regions: ["Normandie"],
    // Tracé de la déviation routière entre Yvetot et Valliquerville (76).
    projet_map: cartographie(
      ligne(
        [
          [0.756, 49.617],
          [0.74, 49.622],
          [0.72, 49.628],
          [0.7, 49.63],
        ],
        "Tracé de la déviation RD 73",
      ),
    ),
    name: "Déviation de la RD 73 – Yvetot / Valliquerville (76)",
    ddep_required: true,
    free_comment:
      "Dossier reçu le 22/05/2023. Rattaché à l'AE instruite par la préfecture de Seine-Maritime.\n- 22/05/2023 : dépôt du dossier\n- 08/09/2023 : demande de compléments (impact zone humide)\n- 14/02/2024 : réception compléments\n- 03/06/2024 : saisine CNPN\n- En attente avis CNPN",
    onagre_demande_identifier: "2023-05-00076-001-002",
    public_consultation_start_date: new Date("2023-10-16"),
    linked_to_ae_regime: true,
    next_action_expected_from: "CNPN/CSRPN",
    main_activite: "Infrastructures de transport routières",
    description:
      "Création d'une déviation de 3,4 km de la route départementale 73 au sud d'Yvetot, afin de délester le centre-bourg du trafic de transit. Le tracé traverse une zone bocagère présentant des enjeux pour le Triton crêté, la Rainette verte, plusieurs espèces de chiroptères et le Murin de Bechstein. Une zone humide de 2,4 ha sera impactée de manière résiduelle malgré les mesures d'évitement.",
    intervention_start_date: new Date("2025-03-01"),
    intervention_end_date: new Date("2027-06-30"),
    intervention_duration: 2,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification:
      "Quatre variantes de tracé ont été comparées. La variante retenue est celle présentant le moindre impact sur les zones à enjeux écologiques forts, notamment les corridors boisés et les mares à Triton crêté. Un tracé plus au nord présentait des impacts beaucoup plus importants sur des boisements anciens.",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification:
      "La déviation répond à un enjeu de sécurité routière (route accidentogène traversant une zone scolaire) et de qualité de vie des riverains du centre-bourg d'Yvetot.",
    mesures_erc_planned: true,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: true,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: true,
    public_consultation_end_date: new Date("2023-11-17"),
    er_mesures_sufficient: false,
    enjeu: true,
  },
  // -------------------------------------------------------------------------
  // D7 — Extension carrière de calcaire – DREAL BFC
  // Phase actuelle : Classé sans suite
  // -------------------------------------------------------------------------
  {
    demarche_numerique_number: "99000007",
    groupe_instructeur: "DREAL BFC",
    demandeur_personne_morale: "39284715600014",
    representative_email: "bernard.chevallier@carrieres-nuiton.example",
    // All three identities: the demandeur identity is the representant, and the dossier
    // was filed by a mandataire (a bureau d'étude).
    deposant_email: "bernard.chevallier@carrieres-nuiton.example",
    mandataire_email: "sophie.leduc@gerea-etudes.example",
    depot_date: new Date("2023-11-28T11:10:00+00:00"),
    departments: ["21"],
    communes: [{ name: "Nuits-Saint-Georges", code: "21458", postalCode: "21700" }],
    regions: ["Bourgogne-Franche-Comté"],
    // Carrière de calcaire et son extension près de Nuits-Saint-Georges (21).
    projet_map: cartographie(
      zoneCarree(4.949, 47.135, 0.01, "Carrière existante"),
      zoneCarree(4.962, 47.14, 0.008, "Périmètre d'extension"),
    ),
    name: "Extension de la carrière de calcaire de Chaux – Nuits-Saint-Georges (21)",
    ddep_required: true,
    free_comment:
      "Dossier reçu le 28/11/2023. Demande de compléments envoyée le 15/02/2024 (absence d'inventaire chiroptères hivernal). Relance adressée le 18/06/2024. Sans réponse du pétitionnaire. Dossier classé sans suite le 15/11/2024 pour non-réponse dans le délai imparti.",
    onagre_demande_identifier: "",
    public_consultation_start_date: null,
    linked_to_ae_regime: false,
    next_action_expected_from: null,
    main_activite: "Carrières",
    description:
      "Extension d'une carrière de calcaire existante vers le nord sur 8 hectares supplémentaires. Les inventaires naturalistes révèlent la présence de pelouses calcicoles abritant plusieurs espèces d'orchidées protégées et un habitat favorable pour le Lézard des souches et le Grand rhinolophe.",
    intervention_start_date: null,
    intervention_end_date: null,
    intervention_duration: null,
    scientifique_demande_type: null,
    scientifique_suivi_protocol_description: null,
    scientifique_capture_mode: null,
    scientifique_light_source_conditions: null,
    scientifique_marking_conditions: null,
    scientifique_transport_conditions: null,
    scientifique_intervention_perimeter: null,
    scientifique_intervenants: null,
    scientifique_other_intervenants_details: null,
    scientifique_previous_assessment: null,
    scientifique_demande_purposes: null,
    no_other_satisfactory_solution_justification: "",
    motif_derogation:
      "Pour des raisons impératives d'intérêt public majeur (RIIPM) (santé, sécurité publique, sociale, économique conséquences bénéfiques primordiales pour l'environnement)",
    motif_derogation_justification: "",
    mesures_erc_planned: null,
    dossier_oiseau_simple_destroyed_nids_count: null,
    dossier_oiseau_simple_compensated_nids_count: null,
    type: null,
    demarche_number: 88444,
    ecological_inventory_completed: false,
    especes_present_in_influence_area: true,
    risk_despite_erc_mesures: null,
    public_consultation_end_date: null,
    er_mesures_sufficient: null,
    enjeu: false,
  },
];
