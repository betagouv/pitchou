import type {
  ClassificationEtreVivant,
  EspeceProtegee,
  EspeceProtegeeStrings,
  TAXREF_ROW,
} from "@pitchou/types/especes.d.ts";
import type EspeceProtegeeRow from "@pitchou/types/database/public/EspeceProtegee.ts";

const classifications: Set<"oiseau" | "faune non-oiseau" | "flore"> = new Set([
  "oiseau",
  "faune non-oiseau",
  "flore",
]);

export function isClassif(x: string): x is ClassificationEtreVivant {
  // @ts-ignore Set.has accepts the narrower union at runtime.
  return classifications.has(x);
}

export function TAXREF_ROWClassification({ REGNE, CLASSE }: TAXREF_ROW): ClassificationEtreVivant {
  if (REGNE === "Plantae" || REGNE === "Fungi" || REGNE === "Chromista") return "flore";
  if (REGNE === "Animalia") return CLASSE === "Aves" ? "oiseau" : "faune non-oiseau";
  throw new TypeError(`Classification non reconnue pour REGNE ${REGNE} et CLASSE ${CLASSE}`);
}

export function nomsVernaculaires(NOM_VERN: TAXREF_ROW["NOM_VERN"]): string[] {
  return NOM_VERN === "" ? [] : NOM_VERN.split(",").map((name) => name.trim());
}

export function especeLabel(espece: EspeceProtegee): string {
  const nomVernaculaire = [...espece.nomsVernaculaires][0];
  const nomScientifique = [...espece.nomsScientifiques][0] ?? "";
  return nomVernaculaire ? `${nomVernaculaire} (${nomScientifique})` : nomScientifique;
}

export function especeProtegeeStringToEspeceProtegee({
  CD_REF,
  CD_TYPE_STATUTS,
  classification,
  nomsScientifiques,
  nomsVernaculaires,
  espèceCNPN: especeCNPN,
  espèceMinistérielle: especeMinisterielle,
}: EspeceProtegeeStrings): EspeceProtegee {
  assertClassification(classification);
  return {
    CD_REF,
    // @ts-ignore Trusting generated data.
    CD_TYPE_STATUTS: new Set(CD_TYPE_STATUTS.split(",")),
    classification,
    nomsScientifiques: new Set(nomsScientifiques.split(",")),
    nomsVernaculaires: new Set(nomsVernaculaires.split(",")),
    statutsProtection: [],
    espèceCNPN: especeCNPN === "O" ? especeCNPN : undefined,
    espèceMinistérielle: especeMinisterielle === "O" ? especeMinisterielle : undefined,
  };
}

export function dbRowToEspeceProtegee(
  row: EspeceProtegeeRow &
    Pick<EspeceProtegee, "statutsProtection"> & { statuts_protection?: never },
): EspeceProtegee;
export function dbRowToEspeceProtegee(
  row: EspeceProtegeeRow & { statuts_protection?: EspeceProtegee["statutsProtection"] },
): EspeceProtegee;
export function dbRowToEspeceProtegee(
  row: EspeceProtegeeRow & {
    statutsProtection?: EspeceProtegee["statutsProtection"];
    statuts_protection?: EspeceProtegee["statutsProtection"];
  },
): EspeceProtegee {
  assertClassification(row.classification);
  return {
    CD_REF: row.cd_ref,
    classification: row.classification,
    nomsScientifiques: new Set(row.noms_scientifiques),
    nomsVernaculaires: new Set(row.noms_vernaculaires),
    // @ts-ignore Trusting generated data.
    CD_TYPE_STATUTS: new Set(row.cd_type_statuts),
    statutsProtection: row.statutsProtection ?? row.statuts_protection ?? [],
    espèceMinistérielle: row.espece_ministerielle ? "O" : undefined,
    espèceCNPN: row.espece_cnpn ? "O" : undefined,
  };
}

function assertClassification(value: string): asserts value is ClassificationEtreVivant {
  if (!isClassif(value)) {
    throw new TypeError(
      `Classification d'espèce non reconnue: ${value}. Les choix sont : ${[...classifications].join(", ")}`,
    );
  }
}
