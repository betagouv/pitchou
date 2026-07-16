/// <reference path="./odfjs.d.ts" />
import { createOdsFile, getODSTableRawContent, tableRawContentToObjects } from "@odfjs/odfjs";
import * as XLSX from "xlsx";
import type {
  ClassificationEtreVivant,
  EspeceProtegee,
  ByClassification,
  EspeceProtegeeStrings,
  TAXREF_ROW,
  OiseauAtteint,
  FloreAtteinte,
  FauneNonOiseauAtteinte,
  DescriptionMenacesEspeces,
  DescriptionMenaceEspeceJSON,
  ActiviteMenancante,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
  QuantifiedImpact,
} from "@pitchou/types/especes.d.ts";
import type { default as EspeceProtegeeRow } from "@pitchou/types/database/public/EspeceProtegee.ts";
import type {
  FauneNonOiseauAtteinteOds_V1,
  FichierEspecesImpacteesOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type { PitchouState } from "@pitchou/types/pitchou-state.ts";

const classificationEtreVivants: Set<"oiseau" | "faune non-oiseau" | "flore"> = new Set([
  "oiseau",
  "faune non-oiseau",
  "flore",
]);

export function isClassif(x: string): x is ClassificationEtreVivant {
  // @ts-ignore
  return classificationEtreVivants.has(x);
}

export function TAXREF_ROWClassification({ REGNE, CLASSE }: TAXREF_ROW): ClassificationEtreVivant {
  if (REGNE === "Plantae" || REGNE === "Fungi" || REGNE === "Chromista") {
    return "flore";
  }

  if (REGNE === "Animalia") {
    if (CLASSE === "Aves") {
      return "oiseau";
    } else {
      return "faune non-oiseau";
    }
  }

  throw new TypeError(`Classification non reconnue pour REGNE ${REGNE} et CLASSE ${CLASSE}`);
}

export function nomsVernaculaires(NOM_VERN: TAXREF_ROW["NOM_VERN"]): string[] {
  if (NOM_VERN === "") return [];
  return NOM_VERN.split(",").map((n) => n.trim());
}

export function especeLabel(espece: EspeceProtegee): string {
  return `${[...espece.nomsVernaculaires][0]} (${[...espece.nomsScientifiques][0]})`;
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
  if (!isClassif(classification)) {
    throw new TypeError(
      `Classification d'espèce non reconnue: ${classification}. Les choix sont : ${[...classificationEtreVivants].join(", ")}`,
    );
  }

  return {
    CD_REF,
    //@ts-ignore trusting data generation
    CD_TYPE_STATUTS: new Set(CD_TYPE_STATUTS.split(",")),
    //@ts-ignore trusting data generation
    classification,
    nomsScientifiques: new Set(nomsScientifiques.split(",")),
    nomsVernaculaires: new Set(nomsVernaculaires.split(",")),
    statutsProtection: [],
    espèceCNPN: especeCNPN === "O" ? especeCNPN : undefined,
    espèceMinistérielle: especeMinisterielle === "O" ? especeMinisterielle : undefined,
  };
}

/**
 * Converts a raw `espece_protegee` database row into the domain `EspèceProtégée`.
 * `text[]` columns become `Set<…>` and booleans become `"O" | undefined`, keeping
 * the shape consumed by the rest of the app unchanged. Works both server-side (knex
 * rows) and client-side (rows deserialized from the API as plain JSON).
 */
export function dbRowToEspeceProtegee(
  row: EspeceProtegeeRow &
    Pick<EspeceProtegee, "statutsProtection"> & {
      statuts_protection?: never;
    },
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
  const { classification } = row;

  if (!isClassif(classification)) {
    throw new TypeError(
      `Classification d'espèce non reconnue: ${classification}. Les choix sont : ${[...classificationEtreVivants].join(", ")}`,
    );
  }

  return {
    CD_REF: row.cd_ref,
    classification,
    nomsScientifiques: new Set(row.noms_scientifiques),
    nomsVernaculaires: new Set(row.noms_vernaculaires),
    //@ts-ignore trusting data generation
    CD_TYPE_STATUTS: new Set(row.cd_type_statuts),
    statutsProtection: row.statutsProtection ?? row.statuts_protection ?? [],
    espèceMinistérielle: row.espece_ministerielle ? "O" : undefined,
    espèceCNPN: row.espece_cnpn ? "O" : undefined,
  };
}

function toSheetRawCellContent(x: undefined | null | number | string | boolean) {
  if (x === undefined || x === null || Number.isNaN(x)) return { type: "string", value: "" };

  if (typeof x === "number") return { type: "float", value: x };

  if (typeof x === "string") return { type: "string", value: x };

  return { type: "string", value: String(x) };
}

function oiseauxAtteintsToTableContent(oiseauxAtteints: OiseauAtteint[]) {
  const sheetRawContent = [
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
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    nombreNids,
    nombreOeufs,
    surfaceHabitatDétruit: surfaceHabitatDetruit,
    activité: activite,
    méthode: methode,
    moyenDePoursuite,
  } of oiseauxAtteints) {
    const labelActivite = activite && activite["Libellé Pitchou"];
    const identifiantPitchouActivite = activite && activite["Identifiant Pitchou"];
    const codeEuropeActivite = activite && activite["Code rapportage européen"];
    const labelMethode = methode && methode["Libellé Pitchou"];
    const codeMethode = methode && methode.Code;
    const labelMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite["Libellé Pitchou"];
    const codeMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite.Code;

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        nombreNids,
        nombreOeufs,
        surfaceHabitatDetruit,
        labelActivite,
        identifiantPitchouActivite,
        codeEuropeActivite,
        labelMethode,
        codeMethode,
        labelMoyenDePoursuite,
        codeMoyenDePoursuite,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

function faunesNonOiseauAtteintesToTableContent(
  faunesNonOiseauAtteintes: FauneNonOiseauAtteinte[],
) {
  const sheetRawContent = [
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
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    surfaceHabitatDétruit: surfaceHabitatDetruit,
    activité: activite,
    méthode: methode,
    moyenDePoursuite,
  } of faunesNonOiseauAtteintes) {
    const labelActivite = activite && activite["Libellé Pitchou"];
    const identifiantPitchouActivite = activite && activite["Identifiant Pitchou"];
    const codeEuropeActivite = activite && activite["Code rapportage européen"];
    const labelMethode = methode && methode["Libellé Pitchou"];
    const codeMethode = methode && methode.Code;
    const labelMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite["Libellé Pitchou"];
    const codeMoyenDePoursuite = moyenDePoursuite && moyenDePoursuite.Code;

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        surfaceHabitatDetruit,
        labelActivite,
        identifiantPitchouActivite,
        codeEuropeActivite,
        labelMethode,
        codeMethode,
        labelMoyenDePoursuite,
        codeMoyenDePoursuite,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

function floresAtteintesToTableContent(floresAtteintes: FloreAtteinte[]) {
  const sheetRawContent = [
    [
      "noms vernaculaires",
      "noms scientifique",
      "CD_REF",
      "nombre individus",
      "surface habitat détruit",
      "activité",
      "identifiant pitchou activité",
      "code activité",
    ].map(toSheetRawCellContent),
  ];

  for (const {
    espèce: { nomsScientifiques, nomsVernaculaires, CD_REF },
    nombreIndividus,
    surfaceHabitatDétruit: surfaceHabitatDetruit,
    activité: activite,
  } of floresAtteintes) {
    const labelActivite = activite && activite["Libellé Pitchou"];
    const identifiantPitchouActivite = activite && activite["Identifiant Pitchou"];
    const codeEuropeActivite = activite && activite["Code rapportage européen"];

    sheetRawContent.push(
      [
        [...nomsVernaculaires].join(", "),
        [...nomsScientifiques].join(", "),
        CD_REF,
        nombreIndividus,
        surfaceHabitatDetruit,
        labelActivite,
        identifiantPitchouActivite,
        codeEuropeActivite,
      ].map(toSheetRawCellContent),
    );
  }

  return sheetRawContent;
}

export function descriptionMenacesEspecesToOdsArrayBuffer(
  descriptionMenacesEspeces: DescriptionMenacesEspeces,
): Promise<ArrayBuffer> {
  const odsContent = new Map();

  if (descriptionMenacesEspeces["oiseau"].length >= 1) {
    odsContent.set("oiseau", oiseauxAtteintsToTableContent(descriptionMenacesEspeces["oiseau"]));
  }

  if (descriptionMenacesEspeces["faune non-oiseau"].length >= 1) {
    odsContent.set(
      "faune non-oiseau",
      faunesNonOiseauAtteintesToTableContent(descriptionMenacesEspeces["faune non-oiseau"]),
    );
  }

  if (descriptionMenacesEspeces["flore"].length >= 1) {
    odsContent.set("flore", floresAtteintesToTableContent(descriptionMenacesEspeces["flore"]));
  }

  odsContent.set("metadata", [
    ["version fichier", "version TaxRef", "schema rapportage européen"].map(toSheetRawCellContent),
    ["1.1.0", "17.0", "http://dd.eionet.europa.eu/schemas/habides-2.0/derogations.xsd"].map(
      toSheetRawCellContent,
    ),
  ]);

  return createOdsFile(odsContent);
}

function descriptionMenacesEspecesFromJSON(
  descriptionMenacesEspecesJSON: DescriptionMenaceEspeceJSON[],
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >,
): DescriptionMenacesEspeces {
  const descriptionMenacesEspeces: DescriptionMenacesEspeces = Object.create(null);

  descriptionMenacesEspecesJSON.forEach(({ classification, etresVivantsAtteints }) => {
    //@ts-ignore
    descriptionMenacesEspeces[classification] = etresVivantsAtteints.map(
      //@ts-ignore
      // `espèce` (accented) is the current serialized key; `espece` is a legacy
      // key kept for backward compatibility. Their accents must stay to read
      // both shapes of persisted data.
      ({ espèce, espece, activité: activite, méthode: methode, moyenDePoursuite, ...rest }) => {
        //@ts-expect-error TS does not understand that if `espèce` is missing
        // then `espece` is necessarily set
        const deprecatedEspeceParam = especeByCD_REF.get(espece);

        return {
          espèce: especeByCD_REF.get(espèce) || deprecatedEspeceParam,
          // @ts-ignore
          activité: activites[classification].get(activite),
          méthode: methodes[classification].get(methode),
          moyenDePoursuite: moyensDePoursuite[classification].get(moyenDePoursuite),
          ...rest,
        };
      },
    );
  });

  return descriptionMenacesEspeces;
}

function b64ToUTF8(s: string): string {
  return decodeURIComponent(escape(atob(s)));
}

export function importDescriptionMenacesEspecesFromURL(
  url: URL,
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >,
): DescriptionMenacesEspeces | undefined {
  const urlData = url.searchParams.get("data");
  if (urlData) {
    try {
      const data = JSON.parse(b64ToUTF8(urlData));
      const desc = descriptionMenacesEspecesFromJSON(
        data,
        especeByCD_REF,
        activites,
        methodes,
        moyensDePoursuite,
      );
      return desc;
    } catch (e) {
      console.error("Parsing error", e, urlData);
      return undefined;
    }
  }
}

function rowEspeceImpacteeHasCD_REF(
  especeImpactee: OiseauAtteintOds_V1 | FauneNonOiseauAtteinteOds_V1 | FloreAtteinteOds_V1,
): boolean {
  return !!especeImpactee.CD_REF;
}

/**
 * In .ods files generated by Pitchou, CD_REF is stored as text, but a
 * petitionnaire's .xlsx may store it as a number. Coerce it back to a string so
 * the lookup against the string-keyed espece map succeeds for both formats.
 */
function normalizeCD_REF<T extends { CD_REF: string }>(row: T): T {
  if (row.CD_REF !== undefined && row.CD_REF !== null && (row.CD_REF as unknown) !== "") {
    row.CD_REF = String(row.CD_REF) as T["CD_REF"];
  }
  return row;
}

type TableRawContent = Awaited<ReturnType<typeof getODSTableRawContent>>;
type SheetRawContent = TableRawContent extends Map<string, infer V> ? V : never;

/**
 * Both .ods and .xlsx are ZIP archives. An .ods file stores its MIME type
 * "application/vnd.oasis.opendocument.spreadsheet" uncompressed as its first
 * archive entry, so the string appears in clear text within the first bytes.
 * An .xlsx file does not contain this string.
 */
function isODSFile(file: ArrayBuffer): boolean {
  const start = new Uint8Array(file.slice(0, 100));
  const text = new TextDecoder("latin1").decode(start);
  return text.includes("opendocument.spreadsheet");
}

/**
 * Extracts the raw content of a .xlsx file into the same structure
 * (`Map<sheetName, rows[][]>`) as odfjs' `getODSTableRawContent`, so the whole
 * espece parsing pipeline can be reused. SheetJS cell types (`n`, `s`, `b`,
 * `d`, …) are already handled by odfjs' `convertCellValue`.
 */
function getXLSXTableRawContent(file: ArrayBuffer): TableRawContent {
  const workbook = XLSX.read(file, { type: "array", cellDates: true });

  const tableMap: TableRawContent = new Map();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: SheetRawContent = [];

    if (sheet["!ref"]) {
      const range = XLSX.utils.decode_range(sheet["!ref"]);

      for (let r = range.s.r; r <= range.e.r; r++) {
        const row: SheetRawContent[number] = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
          const cell = sheet[XLSX.utils.encode_cell({ r, c })];
          row.push({
            value: cell ? cell.v : "",
            // "z" is SheetJS' blank/stub type, absent from odfjs' union: treat as string.
            type: cell && cell.t !== "z" ? cell.t : "string",
          });
        }
        rows.push(row);
      }
    }

    tableMap.set(sheetName, rows);
  }

  return tableMap;
}

/**
 * Extracts the raw content of an impacted-espece file, whether it is an .ods
 * (downloaded from Pitchou) or an .xlsx (uploaded by a petitionnaire in
 * Demarches Numeriques).
 */
function getTableRawContent(file: ArrayBuffer): Promise<TableRawContent> {
  return isODSFile(file)
    ? getODSTableRawContent(file)
    : Promise.resolve(getXLSXTableRawContent(file));
}

async function importDescriptionMenacesEspecesFromOdsArrayBuffer_version_1(
  odsFile: ArrayBuffer,
  especeByCD_REF: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >,
): Promise<DescriptionMenacesEspeces> {
  const descriptionMenacesEspeces: DescriptionMenacesEspeces = Object.create(null);

  const rawContent = await getTableRawContent(odsFile);
  const odsContent = tableRawContentToObjects(rawContent) as FichierEspecesImpacteesOds_V1;

  let rowsOiseauOds = odsContent.get("oiseau");
  let rowsFauneNonOiseauOds =
    odsContent.get("faune non-oiseau") || odsContent.get("faune_non-oiseau");
  let rowsFloreOds = odsContent.get("flore");

  rowsOiseauOds =
    rowsOiseauOds && rowsOiseauOds.map(normalizeCD_REF).filter(rowEspeceImpacteeHasCD_REF);
  rowsFauneNonOiseauOds =
    rowsFauneNonOiseauOds &&
    rowsFauneNonOiseauOds.map(normalizeCD_REF).filter(rowEspeceImpacteeHasCD_REF);
  rowsFloreOds =
    rowsFloreOds && rowsFloreOds.map(normalizeCD_REF).filter(rowEspeceImpacteeHasCD_REF);

  if (
    !(rowsOiseauOds && rowsOiseauOds.length >= 1) &&
    !(rowsFauneNonOiseauOds && rowsFauneNonOiseauOds.length >= 1) &&
    !(rowsFloreOds && rowsFloreOds.length >= 1)
  ) {
    throw new Error(
      "Le fichier espèces .ods semble ne contenir aucune feuille oiseau, faune non-oiseau ou flore.",
      { cause: "format incorrect" },
    );
  }

  if (rowsOiseauOds && rowsOiseauOds.length >= 1) {
    // retrieve the info from the columns
    descriptionMenacesEspeces["oiseau"] = rowsOiseauOds.map((rowOiseauOds) => {
      const {
        CD_REF,
        "nombre individus": nombreIndividus,
        nids: nombreNids,
        œufs: nombreOeufs,
        "surface habitat détruit": surfaceHabitatDetruit,
        "code activité": codeActivite,
        "code méthode": codeMethode,
        "code transport": moyenDePoursuite,
      } = rowOiseauOds;
      let identifiantPitchouActivite = rowOiseauOds["identifiant pitchou activité"];

      const espece = especeByCD_REF.get(CD_REF);

      if (!espece) {
        throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
      }

      //If no identifiant pitchou activité was found for the row, this is an espece file in a legacy format. In that case, we try to "guess" the identifiant Pitchou Activité from the activity code.
      if (!identifiantPitchouActivite) {
        if (codeActivite === "4") {
          if ((nombreOeufs && nombreOeufs > 0) || (nombreNids && nombreNids > 0)) {
            // Destruction of nests/eggs
            identifiantPitchouActivite = "P-4-1";
          } else {
            // Degradation/destruction of resting/breeding areas
            identifiantPitchouActivite = "P-4-2";
          }
        } else if (codeActivite == "2") {
          // Capture for temporary or permanent captivity
          identifiantPitchouActivite = "P-2-1";
        } else {
          identifiantPitchouActivite = `P-${codeActivite}`;
        }
      }

      return {
        espèce: espece,
        nombreIndividus,
        nombreNids,
        nombreOeufs,
        surfaceHabitatDétruit: surfaceHabitatDetruit,
        activité: activites["oiseau"].get(identifiantPitchouActivite),
        méthode: methodes["oiseau"].get(codeMethode),
        moyenDePoursuite: moyensDePoursuite["oiseau"].get(moyenDePoursuite),
      };
    });
  }

  if (rowsFauneNonOiseauOds && rowsFauneNonOiseauOds.length >= 1) {
    // retrieve the info from the columns
    descriptionMenacesEspeces["faune non-oiseau"] = rowsFauneNonOiseauOds.map(
      (rowFauneNonOiseauOds) => {
        const {
          CD_REF,
          "nombre individus": nombreIndividus,
          "surface habitat détruit": surfaceHabitatDetruit,
          "code activité": codeActivite,
          "code méthode": codeMethode,
          "code transport": codeMoyenDePoursuite,
        } = rowFauneNonOiseauOds;
        let identifiantPitchouActivite = rowFauneNonOiseauOds["identifiant pitchou activité"];

        const espece = especeByCD_REF.get(CD_REF);

        if (!espece) {
          throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
        }

        if (!identifiantPitchouActivite) {
          if (codeActivite === "70") {
            // Means of pursuit of live or dead specimens
            identifiantPitchouActivite = "P-70-2";
          } else {
            identifiantPitchouActivite = `P-${codeActivite}`;
          }
        }

        return {
          espèce: espece,
          nombreIndividus,
          surfaceHabitatDétruit: surfaceHabitatDetruit,
          activité: activites["faune non-oiseau"].get(identifiantPitchouActivite),
          méthode: methodes["faune non-oiseau"].get(codeMethode),
          moyenDePoursuite: moyensDePoursuite["faune non-oiseau"].get(codeMoyenDePoursuite),
        };
      },
    );
  }

  if (rowsFloreOds && rowsFloreOds.length >= 1) {
    // retrieve the info from the columns
    descriptionMenacesEspeces["flore"] = rowsFloreOds.map((rowFloreOds) => {
      const {
        CD_REF,
        "nombre individus": nombreIndividus,
        "surface habitat détruit": surfaceHabitatDetruit,
        "code activité": codeActivite,
        "identifiant pitchou activité": identifiantPitchouActivite,
      } = rowFloreOds;

      const espece = especeByCD_REF.get(CD_REF);

      if (!espece) {
        throw new Error(`Espèce avec CD_REF ${CD_REF} manquante`);
      }

      return {
        espèce: espece,
        nombreIndividus,
        surfaceHabitatDétruit: surfaceHabitatDetruit,
        activité: activites["flore"].get(identifiantPitchouActivite || `P-${codeActivite}`),
      };
    });
  }

  return descriptionMenacesEspeces;
}

export async function buildActivitesMethodesMoyensDePoursuite(
  odsData: Buffer,
): Promise<NonNullable<PitchouState["ActivitésMéthodesMoyensDePoursuite"]>> {
  const rawActivitesMethodesMoyensDePoursuite =
    await getODSTableRawContent(odsData).then(tableRawContentToObjects);

  // The rows are reassigned into new objects so that they have the `Object.prototype.toString` method
  // used by Svelte

  const rawActivites: ByClassification<ActiviteMenancante[]> = {
    oiseau: rawActivitesMethodesMoyensDePoursuite.get("Activités oiseau")!.map((row) =>
      Object.assign({}, row),
    ),
    "faune non-oiseau": rawActivitesMethodesMoyensDePoursuite.get(
      "Activités faune non oiseau",
    )!.map((row) => Object.assign({}, row)),
    flore: rawActivitesMethodesMoyensDePoursuite.get("Activités flore")!.map((row) =>
      Object.assign({}, row),
    ),
  };

  const rawMethodes: MethodeMenancante[] = rawActivitesMethodesMoyensDePoursuite.get(
    "Méthodes",
  )!.map((row) => Object.assign({}, row));
  const moyensPoursuite: MoyenDePoursuiteMenacant[] = rawActivitesMethodesMoyensDePoursuite.get(
    "Moyens de poursuite",
  )!.map((row) => Object.assign({}, row));

  const ActivitesMethodesMoyensDePoursuite = actMetTransArraysToMapBundle(
    rawActivites,
    rawMethodes,
    moyensPoursuite,
  );

  const identifiantPitchouVersActiviteEtImpactsQuantifies = new Map(
    Object.values(ActivitesMethodesMoyensDePoursuite.activités).flatMap((activites) => {
      return [...activites.entries()].map(([code, activite]) => {
        const impactsQuantifies: QuantifiedImpact[] = [
          "Nombre d'individus",
          "Nids",
          "Œufs",
          "Surface habitat détruit (m²)",
        ];

        const filteredImpactsQuantifies = impactsQuantifies.filter((secondaryData) => {
          return activite[secondaryData] === "Oui";
        });

        const ret: [
          ActiviteMenancante["Identifiant Pitchou"],
          ActiviteMenancante & { impactsQuantifiés: QuantifiedImpact[] },
        ] = [code, { ...activite, impactsQuantifiés: filteredImpactsQuantifies }];
        return ret;
      });
    }),
  );

  const ret = {
    identifiantPitchouVersActivitéEtImpactsQuantifiés:
      identifiantPitchouVersActiviteEtImpactsQuantifies,
    ...ActivitesMethodesMoyensDePoursuite,
  };

  return ret;
}

export function actMetTransArraysToMapBundle(
  rawActivites: ByClassification<ActiviteMenancante[]>,
  rawMethodes: MethodeMenancante[],
  rawMoyensDePoursuite: MoyenDePoursuiteMenacant[],
): {
  activités: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>;
  méthodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>;
  moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  >;
} {
  const activites: ByClassification<
    Map<ActiviteMenancante["Code rapportage européen"], ActiviteMenancante>
  > = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const classification in rawActivites) {
    // @ts-ignore
    const rawActiviteClassification: ActiviteMenancante[] = rawActivites[classification];
    for (const activite of rawActiviteClassification) {
      if (activite["Identifiant Pitchou"] === undefined || activite["Identifiant Pitchou"] === "") {
        // ignore empty lines (certainly comments)
        break;
      }

      activite["Code rapportage européen"] = activite["Code rapportage européen"].toString();
      // @ts-ignore
      activites[classification].set(activite["Identifiant Pitchou"], activite);
    }
  }

  const methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>> = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const methode of rawMethodes) {
    const classif = methode["Espèces"];

    if (!classif.trim() && (methode["Code"] === undefined || methode["Code"] === "")) {
      // ignore empty lines (certainly comments)
      break;
    }

    if (!isClassif(classif)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classif}`);
    }

    methode["Code"] = methode["Code"].toString();

    const classifMeth = methodes[classif];
    Object.freeze(methode);
    classifMeth.set(methode.Code, methode);
    methodes[classif] = classifMeth;
  }

  const moyensDePoursuite: ByClassification<
    Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>
  > = {
    oiseau: new Map(),
    "faune non-oiseau": new Map(),
    flore: new Map(),
  };

  for (const moyenDePoursuite of rawMoyensDePoursuite) {
    const classif = moyenDePoursuite["Espèces"];

    if (
      !classif.trim() &&
      (moyenDePoursuite["Code"] === undefined || moyenDePoursuite["Code"] === "")
    ) {
      // ignore empty lines (certainly comments)
      break;
    }

    if (!isClassif(classif)) {
      throw new TypeError(`Classification d'espèce non reconnue : ${classif}.}`);
    }

    moyenDePoursuite["Code"] = moyenDePoursuite["Code"].toString();

    const classifTrans = moyensDePoursuite[classif];
    Object.freeze(moyenDePoursuite);
    classifTrans.set(moyenDePoursuite.Code, moyenDePoursuite);
    moyensDePoursuite[classif] = classifTrans;
  }

  return {
    activités: activites,
    méthodes: methodes,
    moyensDePoursuite,
  };
}

export const importDescriptionMenacesEspecesFromOdsArrayBuffer =
  importDescriptionMenacesEspecesFromOdsArrayBuffer_version_1;
