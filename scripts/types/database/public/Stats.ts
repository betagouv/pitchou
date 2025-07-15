/**
 * Statistiques des prescriptions par conformité.
 */
export interface StatsConformité {
  /** Le nombre de prescriptions dont le dernier contrôle est Non conforme */
  nb_non_conforme: number;

  /** Le nombre de prescriptions dont le dernier contrôle est Trop tard */
  nb_trop_tard: number;

  /** Le nombre de prescriptions conformes après le 1er contrôle */
  nb_conforme_apres_1: number;

  /** Le nombre de prescriptions conformes après le 2e contrôle */
  nb_conforme_apres_2: number;

  /** Le nombre de prescriptions conformes après le 3e contrôle */
  nb_conforme_apres_3: number;

  /** Le nombre de prescriptions avec retour à la conformité après plus d’un contrôle */
  nb_retour_conformite: number;
}

/**
 * Statistiques d'impact sur la biodiversité des prescriptions conformes.
 */
export interface StatsImpactBiodiversité {
  /** Le nombre total de prescriptions avec au moins un contrôle conforme */
  total_prescriptions_conformes: number;

  /** La somme totale des surfaces évitées (en m² ou ha selon unité) */
  total_surface_évitée: number;

  /** La somme totale des surfaces compensées */
  total_surface_compensée: number;

  /** Le nombre total de nids évités */
  total_nids_évités: number;

  /** Le nombre total de nids compensés */
  total_nids_compensés: number;

  /** Le nombre total d'individus évités */
  total_individus_évités: number;

  /** Le nombre total d'individus compensés */
  total_individus_compensés: number;
}
