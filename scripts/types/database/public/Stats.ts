/**
 * Statistiques des prescriptions par conformité.
 */
export interface StatsConformité {
  /** Le nombre de prescriptions dont le dernier contrôle est Non conforme */
  nb_non_conforme: number;

  /** Le nombre de prescriptions dont le dernier contrôle est Trop tard */
  nb_trop_tard: number;

  /** Le nombre de prescriptions dont le dernier contrôle est autre que Conforme, Non conforme ou Trop tard */
  nb_conformite_autre: number;

  /** Le nombre de prescriptions conformes après le 1er contrôle */
  nb_conforme_apres_1: number;

  /** Le nombre de prescriptions conformes après le 2e contrôle */
  nb_conforme_apres_2: number;

  /** Le nombre de prescriptions conformes après le 3e contrôle */
  nb_conforme_apres_3: number;

  /** Le nombre de prescriptions avec retour à la conformité après plus d’un contrôle */
  nb_retour_conformite: number;
}
