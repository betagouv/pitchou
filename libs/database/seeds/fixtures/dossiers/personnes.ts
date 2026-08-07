import type { SeedPersonne } from "./types.ts";

export const SEED_PERSONNES: SeedPersonne[] = [
  // Representative of L'ECHAPPEE BELLE (D10 & D11)
  {
    last_name: "Le Goff",
    first_names: "Katell",
    email: "katell.legoff@echappee-belle.example",
    phone: "02 96 78 12 34",
    role: "Directrice de projet",
  },
  // Personne physique demandeur — D1 (Parc éolien des Monts d'Arrée)
  {
    last_name: "Tanguy",
    first_names: "Yannick",
    email: "yannick.tanguy@example.org",
    address: "3 venelle du Menhir\n29190 Brasparts",
    phone: "06 12 34 56 78",
    role: "Professeur émérite des universités",
  },
  // Mandataire — D1: engineering firm that filed the dossier for Yannick Tanguy
  {
    last_name: "Morvan",
    first_names: "Claire",
    email: "claire.morvan@biotope-ouest.example",
    phone: "02 98 45 67 89",
    role: "Chargée d'études faune-flore",
  },
  // Personne physique demandeur — D2
  {
    last_name: "Rieux",
    first_names: "Soizic",
    email: "soizic.rieux@example.org",
    address: "18 rue de la Fontaine\n35000 Rennes",
    phone: "06 98 76 54 32",
    role: "Écologue indépendante",
  },
  // Personne physique demandeur — D3 (rénovation de façade, Thionville)
  {
    last_name: "Klein",
    first_names: "Hervé",
    email: "herve.klein@example.org",
    address: "24 rue de la Paix\n57100 Thionville",
    phone: "06 45 78 90 12",
    role: "Propriétaire de l'immeuble",
  },
  // Representative of CHAUVE-SOURIS AUVERGNE (D4)
  {
    last_name: "Delattre",
    first_names: "Thomas",
    email: "thomas.delattre@chauve-souris-auvergne.example",
    phone: "04 73 89 13 46",
    role: "Coordinateur scientifique",
  },
  // Representative of LPO PAYS DE LA LOIRE (D5)
  {
    last_name: "Bureau",
    first_names: "Sandrine",
    email: "sandrine.bureau@lpo-paysdelaloire.example",
    phone: "02 51 82 04 90",
    role: "Directrice du centre de soins",
  },
  // Representative of DEPARTEMENT DE LA SEINE-MARITIME (D6)
  {
    last_name: "Vasseur",
    first_names: "Élodie",
    email: "elodie.vasseur@seinemaritime.example",
    phone: "02 35 03 55 00",
    role: "Cheffe du service infrastructures routières",
  },
  // Representative of CARRIERES DU NUITON (D7)
  {
    last_name: "Chevallier",
    first_names: "Bernard",
    email: "bernard.chevallier@carrieres-nuiton.example",
    phone: "03 80 61 12 34",
    role: "Gérant",
  },
  // Mandataire — D7: bureau d'étude that filed the dossier for CARRIERES DU NUITON
  {
    last_name: "Leduc",
    first_names: "Sophie",
    email: "sophie.leduc@gerea-etudes.example",
    phone: "05 56 12 34 56",
    role: "Chargée d'études réglementaires",
  },
  // Representative of COMMUNE DE PROVINS (D8)
  {
    last_name: "Aubry",
    first_names: "Jean-Marc",
    email: "jeanmarc.aubry@mairie-provins.example",
    phone: "01 64 60 20 00",
    role: "Adjoint au maire délégué au patrimoine",
  },
  // Representative of COMMUNE DE KOUROU (D9)
  {
    last_name: "Adélaïde",
    first_names: "Marie-Louise",
    email: "ml.adelaide@ville-kourou.example",
    phone: "05 94 22 30 00",
    role: "Directrice des services techniques",
  },
];
