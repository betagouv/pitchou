import { criteresApplicables } from "./typeImpacts.ts";
import type {
  TypeImpactRow,
  MethodeRow,
  MoyenDePoursuiteRow,
} from "@pitchou/common/referentielTypeImpactMethodeMoyenDePoursuite.ts";

export type DetailSection = {
  title: string;
  content: string | string[];
};

export type ReferentielDetail = {
  title: string;
  subtitle?: string;
  badges: string[];
  sections: DetailSection[];
};

export function typeImpactDetail(value: TypeImpactRow): ReferentielDetail {
  return {
    title: value.libelle_pitchou,
    subtitle: `${value.identifiant_pitchou} — ${value.classification} — code européen ${value.code_europeen}`,
    badges: criteresApplicables(value),
    sections: [
      { title: "Libellé de la directive européenne", content: value.libelle_europeen },
      { title: "Activités Onagre correspondantes", content: value.activites_onagre },
    ],
  };
}

export function referentielValueDetail(
  value: MethodeRow | MoyenDePoursuiteRow,
  nature: string,
): ReferentielDetail {
  return {
    title: value.libelle_pitchou,
    subtitle: `${nature} — ${value.classification} — code européen ${value.code}`,
    badges: [],
    sections: [{ title: "Libellé de la directive européenne", content: value.libelle_europeen }],
  };
}
