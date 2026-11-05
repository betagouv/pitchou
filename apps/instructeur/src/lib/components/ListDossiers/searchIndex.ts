import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
import type { DossiersContext } from "./query.ts";
import { baseSearchableText, especesSearchableText } from "./dossiersSearch.ts";

/** Prepare searches during loading, yielding between batches to keep the page responsive. */
export async function prepareSearchIndex(
  dossiers: DossierSummary[],
  especeByCD_REF?: DossiersContext["especeByCD_REF"],
): Promise<void> {
  let index = 0;
  while (index < dossiers.length) {
    const deadline = performance.now() + 8;
    while (index < dossiers.length && performance.now() < deadline) {
      const dossier = dossiers[index++];
      baseSearchableText(dossier);
      especesSearchableText(dossier, especeByCD_REF);
    }
    if (index < dossiers.length)
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
  }
}
