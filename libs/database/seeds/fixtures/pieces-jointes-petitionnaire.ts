export type SeedPieceJointe = {
  /** demarche_numerique_number du dossier, pour le retrouver en DB */
  dossier: string;
  name: string;
  media_type: string;
  demarche_numerique_created_at: Date;
};

export const SEED_PIECES_JOINTES_PETITIONNAIRE: SeedPieceJointe[] = [
  // D1 — Parc éolien des Monts d'Arrée (Bretagne)
  {
    dossier: "99000001",
    name: "etude-impact-chiropteres.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-01-12"),
  },
  {
    dossier: "99000001",
    name: "protocole-suivi-avifaune.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-01-12"),
  },
  {
    dossier: "99000001",
    name: "plan-implantation-eoliennes.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-01-13"),
  },

  // D3 — Rénovation de façade, nids d'hirondelles (Thionville)
  {
    dossier: "99000003",
    name: "inventaire-nids-hirondelles.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-02-03"),
  },
  {
    dossier: "99000003",
    name: "mesures-compensation-nidification.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-02-04"),
  },

  // D5 — Transport et relâcher d'espèces protégées (Centre de soins LPO)
  {
    dossier: "99000005",
    name: "protocole-soins-transport-faune.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-02-18"),
  },

  // D6 — Déviation de la RD 73 (Yvetot / Valliquerville)
  {
    dossier: "99000006",
    name: "etude-impact-faune-flore.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-03-02"),
  },
  {
    dossier: "99000006",
    name: "dossier-concertation-publique.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-03-02"),
  },
  {
    dossier: "99000006",
    name: "plan-passages-faune.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-03-03"),
  },

  // D8 — Réhabilitation du clocher, nid de cigognes (Provins)
  {
    dossier: "99000008",
    name: "diagnostic-clocher-cigognes.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-03-19"),
  },
  {
    dossier: "99000008",
    name: "plan-plateforme-nidification.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-03-20"),
  },

  // D10 — Aménagement de lotissement (Ploufragan)
  {
    dossier: "99000010",
    name: "démo - voie verte cyclable rennes-dinan.jpg",
    media_type: "image/jpeg",
    demarche_numerique_created_at: new Date("2026-04-06"),
  },
  {
    dossier: "99000010",
    name: "Etat des lieux écologique V2.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-04-07"),
  },
  {
    dossier: "99000010",
    name: "démo - forêt sur le lieu de l'aménagement.jpg",
    media_type: "image/jpeg",
    demarche_numerique_created_at: new Date("2026-04-07"),
  },

  // D11 — Agrandissement pistes cyclables Rennes-Dinan
  {
    dossier: "99000011",
    name: "démo - voie verte cyclable rennes-dinan.jpg",
    media_type: "image/jpeg",
    demarche_numerique_created_at: new Date("2026-04-15"),
  },
  {
    dossier: "99000011",
    name: "Etat des lieux écologique V2.pdf",
    media_type: "application/pdf",
    demarche_numerique_created_at: new Date("2026-04-16"),
  },
  {
    dossier: "99000011",
    name: "démo - forêt sur le lieu de l'aménagement.jpg",
    media_type: "image/jpeg",
    demarche_numerique_created_at: new Date("2026-04-16"),
  },
];
