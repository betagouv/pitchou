import type { DossierPhase, DossierProchaineActionAttenduePar } from "./API_Pitchou";
import type Dossier from "./database/public/Dossier";
import type Personne from "./database/public/Personne";

export type TriTableau = {
  id: string; // serializable identifier to identify the selected sort in localStorage
  nom: string; // display name in the user interface
  trier: () => void;
};

export type FiltresLocalStorage = {
  phases: DossierPhase[];
  "prochaine action attendue de": DossierProchaineActionAttenduePar[];
  instructeurs: NonNullable<Personne["email"]>[];
  activitésPrincipales: NonNullable<Dossier["activité_principale"]>[];
  texte: string;
};

export type TriLocalStorage = TriTableau["id"];

export type TriFiltreLocalStorage = Partial<{
  tri: TriLocalStorage;
  filtres: Partial<FiltresLocalStorage>;
}>;
