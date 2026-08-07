import type { ClassificationEtreVivant } from "@pitchou/types/especes.d.ts";

export type CritereName =
  "methode" | "moyenDePoursuite" | "nombreIndividus" | "nids" | "oeufs" | "surfaceHabitatDetruit";

export type TypeImpactProjete = {
  identifiantPitchou: string;
  codeEuropeen: string;
  classification: ClassificationEtreVivant;
  libellePitchou: string;
  criteres: Record<CritereName, boolean>;
};

export type ValeurProjetee = {
  code: string;
  classification: ClassificationEtreVivant;
  libellePitchou: string;
};

export type ReferentielProjete = {
  typesImpact: TypeImpactProjete[];
  methodes: ValeurProjetee[];
  moyensDePoursuite: ValeurProjetee[];
};
