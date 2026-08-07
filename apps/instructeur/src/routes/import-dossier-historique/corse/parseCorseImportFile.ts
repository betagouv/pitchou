import { extractFirstMail } from "../importDossierUtils.ts";
import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";
import type { DossierCorseRow } from "./DossierCorseRow.ts";

export async function parseCorseImportFile(file: File) {
  const sheets = await getODSTableRawContent(await file.arrayBuffer());
  const tracking = sheets.get("Instruction");
  const instructeurs = sheets.get("Instructeur DREAL");
  if (!tracking)
    throw new TypeError(
      "Erreur dans la récupération de la feuille Instruction. Assurez-vous que cette feuille existe bien dans votre tableur ods.",
    );
  if (!instructeurs)
    throw new TypeError(
      "Erreur dans la récupération de la feuille Instructeur DREAL. Assurez-vous que cette feuille existe bien dans votre tableur ods.",
    );
  const emails = new Map(
    instructeurs
      .map((row: { value: any }[]) => {
        const email = extractFirstMail(row[1]?.value ?? "");
        return row[0]?.value && email ? ([row[0].value, email] as [string, string]) : null;
      })
      .filter((entry): entry is [string, string] => entry !== null),
  );
  const rows = [
    ...sheetRawContentToObjects(tracking.filter(isRowNotEmpty)).values(),
  ] as DossierCorseRow[];
  return { emails, rows };
}
