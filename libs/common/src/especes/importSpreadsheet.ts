import { tableRawContentToObjects } from "@odfjs/odfjs";
import type {
  FichierEspecesImpacteesOds_V1,
  FauneNonOiseauAtteinteOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type { DescriptionMenacesEspeces } from "@pitchou/types/especesImpact.d.ts";
import type {
  ActiviteMenancante,
  ByClassification,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import { assertSpeciesSpreadsheet, getTableRawContent } from "./spreadsheetContent.ts";
import { parseFaunes, parseFlores, parseOiseaux } from "./spreadsheetRows.ts";
import type { LineFile, ReportAnomalie } from "./spreadsheetRows.ts";
import type { ReferentielMaps } from "./types.ts";

export { assertSpeciesSpreadsheet };

function validRow<T extends { CD_REF: string }>(row: T): boolean {
  if (row.CD_REF !== undefined && row.CD_REF !== null && (row.CD_REF as unknown) !== "") {
    row.CD_REF = String(row.CD_REF) as T["CD_REF"];
  }
  return Boolean(row.CD_REF);
}

function filledLines<T extends { CD_REF: string }>(
  rows: T[] | undefined,
): LineFile<T>[] | undefined {
  //The header is line 1 and is consumed as the column names, so the first data line is line 2.
  return rows?.map((row, index) => ({ row, ligne: index + 2 })).filter(({ row }) => validRow(row));
}

async function parseSpreadsheet(
  file: ArrayBuffer,
  especes: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  maps: ReferentielMaps,
  report: ReportAnomalie,
): Promise<DescriptionMenacesEspeces> {
  const raw = await getTableRawContent(file);
  const content = tableRawContentToObjects(raw) as FichierEspecesImpacteesOds_V1;

  const oiseaux = filledLines(content.get("oiseau") as OiseauAtteintOds_V1[] | undefined);
  const faunes = filledLines(
    (content.get("faune non-oiseau") || content.get("faune_non-oiseau")) as
      FauneNonOiseauAtteinteOds_V1[] | undefined,
  );
  const flores = filledLines(content.get("flore") as FloreAtteinteOds_V1[] | undefined);

  if (!oiseaux?.length && !faunes?.length && !flores?.length) {
    throw new Error(
      "Le fichier espèces .ods semble ne contenir aucune feuille oiseau, faune non-oiseau ou flore.",
      { cause: "format incorrect" },
    );
  }

  const description: DescriptionMenacesEspeces = Object.create(null);
  if (oiseaux?.length) description.oiseau = parseOiseaux(oiseaux, especes, maps, report);
  if (faunes?.length) description["faune non-oiseau"] = parseFaunes(faunes, especes, maps, report);
  if (flores?.length) description.flore = parseFlores(flores, especes, maps, report);
  return description;
}

/**
 * Reads a "fichier espèces impactées" file, throwing on the first thing it cannot resolve.
 */
export async function importDescriptionMenacesEspecesFromOdsArrayBuffer(
  file: ArrayBuffer,
  especes: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyens: ByClassification<Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>>,
): Promise<DescriptionMenacesEspeces> {
  return parseSpreadsheet(file, especes, { activites, methodes, moyens }, ({ message }) => {
    throw new Error(message);
  });
}

export { parseSpreadsheet };
