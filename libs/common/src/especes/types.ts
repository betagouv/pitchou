import type {
  ActiviteMenancante,
  ByClassification,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";

export type ReferentielMaps = {
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>;
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>;
  moyens: ByClassification<Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>>;
};
