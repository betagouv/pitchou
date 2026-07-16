import type { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou";
import type Dossier from "./database/public/Dossier";
import type Personne from "./database/public/Personne";

export type TableSort = {
  id: string; // serializable identifier to identify the selected sort in localStorage
  nom: string; // display name in the user interface
  sort: () => void;
};

export type FiltersLocalStorage = {
  phases: DossierPhase[];
  "prochaine action attendue de": DossierProchaineActionAttenduePar[];
  instructeurs: NonNullable<Personne["email"]>[];
  activitésPrincipales: NonNullable<Dossier["activité_principale"]>[];
  texte: string;
};

export type SortLocalStorage = TableSort["id"];

export type SortFilterLocalStorage = Partial<{
  tri: SortLocalStorage;
  filtres: Partial<FiltersLocalStorage>;
}>;
