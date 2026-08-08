import { tableRawContentToObjects } from "@odfjs/odfjs";
import type {
  FichierEspecesImpacteesOds_V1,
  FauneNonOiseauAtteinteOds_V1,
  FloreAtteinteOds_V1,
  OiseauAtteintOds_V1,
} from "@pitchou/types/especesFichierOds.d.ts";
import type {
  ActiviteMenancante,
  ByClassification,
  DescriptionMenacesEspeces,
  EspeceProtegee,
  MethodeMenancante,
  MoyenDePoursuiteMenacant,
} from "@pitchou/types/especes.d.ts";
import { assertSpeciesSpreadsheet, getTableRawContent } from "./spreadsheetContent.ts";
import { parseFaunes, parseFlores, parseOiseaux } from "./spreadsheetRows.ts";

export { assertSpeciesSpreadsheet };

function validRow<T extends { CD_REF: string }>(row: T): boolean {
  if (row.CD_REF !== undefined && row.CD_REF !== null && (row.CD_REF as unknown) !== "") {
    row.CD_REF = String(row.CD_REF) as T["CD_REF"];
  }
  return Boolean(row.CD_REF);
}

export async function importDescriptionMenacesEspecesFromOdsArrayBuffer(
  file: ArrayBuffer,
  especes: Map<EspeceProtegee["CD_REF"], EspeceProtegee>,
  activites: ByClassification<Map<ActiviteMenancante["Identifiant Pitchou"], ActiviteMenancante>>,
  methodes: ByClassification<Map<MethodeMenancante["Code"], MethodeMenancante>>,
  moyens: ByClassification<Map<MoyenDePoursuiteMenacant["Code"], MoyenDePoursuiteMenacant>>,
): Promise<DescriptionMenacesEspeces> {
  const raw = await getTableRawContent(file);
  const content = tableRawContentToObjects(raw) as FichierEspecesImpacteesOds_V1;
  const oiseaux = content.get("oiseau")?.filter(validRow) as OiseauAtteintOds_V1[] | undefined;
  const faunes = (content.get("faune non-oiseau") || content.get("faune_non-oiseau"))?.filter(
    validRow,
  ) as FauneNonOiseauAtteinteOds_V1[] | undefined;
  const flores = content.get("flore")?.filter(validRow) as FloreAtteinteOds_V1[] | undefined;
  if (!oiseaux?.length && !faunes?.length && !flores?.length) {
    throw new Error(
      "Le fichier espèces .ods semble ne contenir aucune feuille oiseau, faune non-oiseau ou flore.",
      { cause: "format incorrect" },
    );
  }
  const description: DescriptionMenacesEspeces = Object.create(null);
  const maps = { activites, methodes, moyens };
  if (oiseaux?.length) description.oiseau = parseOiseaux(oiseaux, especes, maps);
  if (faunes?.length) description["faune non-oiseau"] = parseFaunes(faunes, especes, maps);
  if (flores?.length) description.flore = parseFlores(flores, especes, maps);
  return description;
}
