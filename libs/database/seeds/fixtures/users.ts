import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

export const SEED_PERSONNES: (Pick<PersonneInitializer, "nom" | "prénoms" | "email"> & {
  groupe: string;
})[] = [
  { prénoms: "Local", nom: "Dev", email: "dev@localhost.local", groupe: "Administrateur" },
  {
    prénoms: "Camille",
    nom: "Rousseau",
    email: "camille.rousseau@dev.pitchou.fr",
    groupe: "Dév Pitchou",
  },
  {
    prénoms: "Marie",
    nom: "Fontaine",
    email: "marie.fontaine@dreal-na.gouv.fr",
    groupe: "DREAL Nouvelle-Aquitaine",
  },
  {
    prénoms: "Jean-Pierre",
    nom: "Moreau",
    email: "jp.moreau@dreal-oc.gouv.fr",
    groupe: "DREAL Occitanie",
  },
  {
    prénoms: "Sophie",
    nom: "Laurent",
    email: "sophie.laurent@ddt02.gouv.fr",
    groupe: "DDT02 -  AISNE",
  },
  {
    prénoms: "Marc",
    nom: "Petit",
    email: "marc.petit@ddt59.gouv.fr",
    groupe: "DDT59 - NORD",
  },
  {
    prénoms: "Isabelle",
    nom: "Lefebvre",
    email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    groupe: "DREAL Grand Est",
  },
  {
    prénoms: "Thomas",
    nom: "Girard",
    email: "thomas.girard@dreal-ara.gouv.fr",
    groupe: "DREAL Auvergne-Rhône-Alpes",
  },
  {
    prénoms: "Claire",
    nom: "Morin",
    email: "claire.morin@dreal-bretagne.gouv.fr",
    groupe: "DREAL BRETAGNE",
  },
  {
    prénoms: "Nathalie",
    nom: "Chevalier",
    email: "nathalie.chevalier@deal-reunion.gouv.fr",
    groupe: "DEAL Réunion",
  },
  {
    prénoms: "Antoine",
    nom: "Dubois",
    email: "antoine.dubois@multi-regions.gouv.fr",
    groupe: "Multi-régions",
  },
  {
    prénoms: "Élodie",
    nom: "Bernard",
    email: "elodie.bernard@dreal-normandie.gouv.fr",
    groupe: "DREAL Normandie",
  },
  {
    prénoms: "François",
    nom: "Durand",
    email: "francois.durand@ddt45.gouv.fr",
    groupe: "DDT 45 - Loiret",
  },
  {
    prénoms: "Aurélie",
    nom: "Simon",
    email: "aurelie.simon@dreal-bfc.gouv.fr",
    groupe: "DREAL BFC",
  },
  {
    prénoms: "Nicolas",
    nom: "Martin",
    email: "nicolas.martin@driat-idf.gouv.fr",
    groupe: "DRIAT IDF",
  },
  {
    prénoms: "Céline",
    nom: "Leroy",
    email: "celine.leroy@ddt02.gouv.fr",
    groupe: "DDT02",
  },
  {
    prénoms: "Pierre-Antoine",
    nom: "Rossi",
    email: "pa.rossi@dreal-corse.gouv.fr",
    groupe: "DREAL de Corse et DMLC",
  },
  {
    prénoms: "Virginie",
    nom: "Blanc",
    email: "virginie.blanc@ddt37.gouv.fr",
    groupe: "DDT37",
  },
  {
    prénoms: "Stéphane",
    nom: "Richard",
    email: "stephane.richard@dreal-pdl.gouv.fr",
    groupe: "DREAL Pays de la loire",
  },
  {
    prénoms: "Audrey",
    nom: "Mercier",
    email: "audrey.mercier@dgtm-guyane.gouv.fr",
    groupe: "DGTM Guyane",
  },
  {
    prénoms: "Benoît",
    nom: "Perrin",
    email: "benoit.perrin@ddt41.gouv.fr",
    groupe: "DDT 41",
  },
  {
    prénoms: "Sylvie",
    nom: "Arnaud",
    email: "sylvie.arnaud@dreal-cvdl.gouv.fr",
    groupe: "DREAL Centre Val de Loire",
  },
];
