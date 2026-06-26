export type SeedPièceJointe = {
  /** id de seed du dossier (9000001…), pas l'id DB */
  dossier: number;
  /** nom du fichier / titre de la pièce jointe */
  nom: string;
  media_type: string;
};

export const SEED_PIÈCES_JOINTES_PÉTITIONNAIRE: SeedPièceJointe[] = [
  // D1 — Parc éolien des Monts d'Arrée (Bretagne)
  {
    dossier: 9000001,
    nom: "etude-impact-chiropteres.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000001,
    nom: "protocole-suivi-avifaune.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000001,
    nom: "plan-implantation-eoliennes.pdf",
    media_type: "application/pdf",
  },

  // D3 — Rénovation de façade, nids d'hirondelles (Thionville)
  {
    dossier: 9000003,
    nom: "inventaire-nids-hirondelles.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000003,
    nom: "mesures-compensation-nidification.pdf",
    media_type: "application/pdf",
  },

  // D5 — Transport et relâcher d'espèces protégées (Centre de soins LPO)
  {
    dossier: 9000005,
    nom: "protocole-soins-transport-faune.pdf",
    media_type: "application/pdf",
  },

  // D6 — Déviation de la RD 73 (Yvetot / Valliquerville)
  {
    dossier: 9000006,
    nom: "etude-impact-faune-flore.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000006,
    nom: "dossier-concertation-publique.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000006,
    nom: "plan-passages-faune.pdf",
    media_type: "application/pdf",
  },

  // D8 — Réhabilitation du clocher, nid de cigognes (Provins)
  {
    dossier: 9000008,
    nom: "diagnostic-clocher-cigognes.pdf",
    media_type: "application/pdf",
  },
  {
    dossier: 9000008,
    nom: "plan-plateforme-nidification.pdf",
    media_type: "application/pdf",
  },
];
