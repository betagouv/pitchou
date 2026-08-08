import { createOdsFile } from "@odfjs/odfjs";
import type {
  DescriptionMenacesEspeces,
  FauneNonOiseauAtteinte,
  FloreAtteinte,
  OiseauAtteint,
} from "@pitchou/types/especes.d.ts";

function cell(value: undefined | null | number | string | boolean) {
  if (value === undefined || value === null || Number.isNaN(value))
    return { type: "string", value: "" };
  if (typeof value === "number") return { type: "float", value };
  return { type: "string", value: String(value) };
}

function menaceValues({
  activité: activite,
  méthode: methode,
  moyenDePoursuite,
}: OiseauAtteint | FauneNonOiseauAtteinte) {
  return [
    activite?.["Libellé Pitchou"],
    activite?.["Identifiant Pitchou"],
    activite?.["Code rapportage européen"],
    methode?.["Libellé Pitchou"],
    methode?.Code,
    moyenDePoursuite?.["Libellé Pitchou"],
    moyenDePoursuite?.Code,
  ];
}

function oiseauxToTable(rows: OiseauAtteint[]) {
  const table = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "nids",
      "œufs",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
      "méthode",
      "code méthode",
      "transport",
      "code transport",
    ].map(cell),
  ];
  for (const row of rows) {
    const { espèce: espece } = row;
    table.push(
      [
        [...espece.nomsVernaculaires].join(", "),
        [...espece.nomsScientifiques].join(", "),
        espece.CD_REF,
        row.nombreIndividus,
        row.nombreNids,
        row.nombreOeufs,
        row.surfaceHabitatDétruit,
        ...menaceValues(row),
      ].map(cell),
    );
  }
  return table;
}

function faunesToTable(rows: FauneNonOiseauAtteinte[]) {
  const table = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
      "méthode",
      "code méthode",
      "transport",
      "code transport",
    ].map(cell),
  ];
  for (const row of rows) {
    const { espèce: espece } = row;
    table.push(
      [
        [...espece.nomsVernaculaires].join(", "),
        [...espece.nomsScientifiques].join(", "),
        espece.CD_REF,
        row.nombreIndividus,
        row.surfaceHabitatDétruit,
        ...menaceValues(row),
      ].map(cell),
    );
  }
  return table;
}

function floresToTable(rows: FloreAtteinte[]) {
  const table = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
    ].map(cell),
  ];
  for (const row of rows) {
    const { espèce: espece, activité: activite } = row;
    table.push(
      [
        [...espece.nomsVernaculaires].join(", "),
        [...espece.nomsScientifiques].join(", "),
        espece.CD_REF,
        row.nombreIndividus,
        row.surfaceHabitatDétruit,
        activite?.["Libellé Pitchou"],
        activite?.["Identifiant Pitchou"],
        activite?.["Code rapportage européen"],
      ].map(cell),
    );
  }
  return table;
}

export function descriptionMenacesEspecesToOdsArrayBuffer(
  description: DescriptionMenacesEspeces,
): Promise<ArrayBuffer> {
  const content = new Map();
  if (description.oiseau.length) content.set("oiseau", oiseauxToTable(description.oiseau));
  if (description["faune non-oiseau"].length)
    content.set("faune non-oiseau", faunesToTable(description["faune non-oiseau"]));
  if (description.flore.length) content.set("flore", floresToTable(description.flore));
  content.set("metadata", [
    ["version fichier", "version TaxRef", "schema rapportage européen"].map(cell),
    ["1.1.0", "17.0", "http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd"].map(cell),
  ]);
  return createOdsFile(content);
}
