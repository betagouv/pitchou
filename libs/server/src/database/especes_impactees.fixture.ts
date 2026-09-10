import type ImpactEspece from "@pitchou/types/database/public/ImpactEspece.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";

export const dossier = 1 as ImpactEspece["dossier"];
export const oldFile = "00000000-0000-4000-8000-000000000001" as FileId;
export const newFile = "00000000-0000-4000-8000-000000000002" as FileId;

export function impact(type: string | null = "P-2-1", nombre_individus = "11-100"): ImpactEspece {
  return {
    dossier,
    source_file: oldFile,
    cd_ref: "2437",
    classification: "oiseau",
    impact_type: type,
    nombre_individus,
    nids: null,
    oeufs: null,
    surface_habitat_detruit: null,
    impact_methode: null,
    impact_moyen_de_poursuite: null,
  } as ImpactEspece;
}

export function changes(queries: { sql: string; values: unknown[] }[]) {
  return queries
    .filter(({ sql }) => sql.startsWith('insert into "action_dossier"'))
    .flatMap(({ values }) =>
      values.filter((value): value is string => typeof value === "string" && value.startsWith("{")),
    )
    .map((value) => JSON.parse(value));
}
