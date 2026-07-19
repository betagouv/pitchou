import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";

export const SEED_PERSONNES: (Pick<PersonneInitializer, "last_name" | "first_names" | "email"> & {
  groupe: string;
})[] = [
  {
    first_names: "Local",
    last_name: "Dev",
    email: "dev@localhost.local",
    groupe: "Administrateur",
  },
  {
    first_names: "Camille",
    last_name: "Rousseau",
    email: "camille.rousseau@dev.pitchou.fr",
    groupe: "Dév Pitchou",
  },
  {
    first_names: "Marie",
    last_name: "Fontaine",
    email: "marie.fontaine@dreal-na.gouv.fr",
    groupe: "DREAL Nouvelle-Aquitaine",
  },
  {
    first_names: "Jean-Pierre",
    last_name: "Moreau",
    email: "jp.moreau@dreal-oc.gouv.fr",
    groupe: "DREAL Occitanie",
  },
  {
    first_names: "Sophie",
    last_name: "Laurent",
    email: "sophie.laurent@ddt02.gouv.fr",
    groupe: "DDT02 -  AISNE",
  },
  {
    first_names: "Marc",
    last_name: "Petit",
    email: "marc.petit@ddt59.gouv.fr",
    groupe: "DDT59 - NORD",
  },
  {
    first_names: "Isabelle",
    last_name: "Lefebvre",
    email: "isabelle.lefebvre@dreal-ge.gouv.fr",
    groupe: "DREAL Grand Est",
  },
  {
    first_names: "Thomas",
    last_name: "Girard",
    email: "thomas.girard@dreal-ara.gouv.fr",
    groupe: "DREAL Auvergne-Rhône-Alpes",
  },
  {
    first_names: "Claire",
    last_name: "Morin",
    email: "claire.morin@dreal-bretagne.gouv.fr",
    groupe: "DREAL BRETAGNE",
  },
  {
    first_names: "Nathalie",
    last_name: "Chevalier",
    email: "nathalie.chevalier@deal-reunion.gouv.fr",
    groupe: "DEAL Réunion",
  },
  {
    first_names: "Antoine",
    last_name: "Dubois",
    email: "antoine.dubois@multi-regions.gouv.fr",
    groupe: "Multi-régions",
  },
  {
    first_names: "Élodie",
    last_name: "Bernard",
    email: "elodie.bernard@dreal-normandie.gouv.fr",
    groupe: "DREAL Normandie",
  },
  {
    first_names: "François",
    last_name: "Durand",
    email: "francois.durand@ddt45.gouv.fr",
    groupe: "DDT 45 - Loiret",
  },
  {
    first_names: "Aurélie",
    last_name: "Simon",
    email: "aurelie.simon@dreal-bfc.gouv.fr",
    groupe: "DREAL BFC",
  },
  {
    first_names: "Nicolas",
    last_name: "Martin",
    email: "nicolas.martin@driat-idf.gouv.fr",
    groupe: "DRIAT IDF",
  },
  {
    first_names: "Céline",
    last_name: "Leroy",
    email: "celine.leroy@ddt02.gouv.fr",
    groupe: "DDT02",
  },
  {
    first_names: "Pierre-Antoine",
    last_name: "Rossi",
    email: "pa.rossi@dreal-corse.gouv.fr",
    groupe: "DREAL de Corse et DMLC",
  },
  {
    first_names: "Virginie",
    last_name: "Blanc",
    email: "virginie.blanc@ddt37.gouv.fr",
    groupe: "DDT37",
  },
  {
    first_names: "Stéphane",
    last_name: "Richard",
    email: "stephane.richard@dreal-pdl.gouv.fr",
    groupe: "DREAL Pays de la loire",
  },
  {
    first_names: "Audrey",
    last_name: "Mercier",
    email: "audrey.mercier@dgtm-guyane.gouv.fr",
    groupe: "DGTM Guyane",
  },
  {
    first_names: "Benoît",
    last_name: "Perrin",
    email: "benoit.perrin@ddt41.gouv.fr",
    groupe: "DDT 41",
  },
  {
    first_names: "Sylvie",
    last_name: "Arnaud",
    email: "sylvie.arnaud@dreal-cvdl.gouv.fr",
    groupe: "DREAL Centre Val de Loire",
  },
];
