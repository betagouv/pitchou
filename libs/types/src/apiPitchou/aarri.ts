export interface IndicatorsAARRI {
  nombreBaseUtilisateuricePotentielle: number;
  nombreUtilisateuriceAcquis: number;
  nombreUtilisateuriceActif: number;
  nombreUtilisateuriceRetenu: number;
  nombreUtilisateuriceImpact: number;
  date: string;
}

export type NiveauAARRI = "base" | "acquis" | "actif" | "retenu" | "impact";

export interface UtilisateurAARRI {
  personneId: number;
  email: string | null;
  lastName: string | null;
  firstNames: string | null;
  niveau: NiveauAARRI;
  groupesInstructeurs: string[];
  actionCount: number;
  lastActivityDate: string | null;
}
