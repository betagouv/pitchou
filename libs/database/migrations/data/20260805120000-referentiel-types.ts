export type TypeImpactRow = {
  identifiant_pitchou: string;
  code_europeen: string;
  classification: string;
  libelle_pitchou: string;
  libelle_europeen: string;
  activites_onagre: string[];
  critere_methode: boolean;
  critere_moyen_de_poursuite: boolean;
  critere_nombre_individus: boolean;
  critere_nids: boolean;
  critere_oeufs: boolean;
  critere_surface_habitat_detruit: boolean;
};

export type ValeurCritereRow = {
  code: string;
  classification: string;
  libelle_pitchou: string;
  libelle_europeen: string;
};
