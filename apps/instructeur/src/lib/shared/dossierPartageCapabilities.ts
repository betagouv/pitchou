import { json, text } from "d3-fetch";
import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  DossierPartageCandidate,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";

const dossierIdURLParam = ":dossierId";

type PartageCapabilities = "listDossierPartageCandidates" | "updateDossierPartages";

export function createDossierPartageCapabilities(
  capURLs: StringValues<Pick<PitchouInstructeurCapabilities, PartageCapabilities>>,
): Pick<Partial<PitchouInstructeurCapabilities>, PartageCapabilities> {
  const listURL = capURLs.listDossierPartageCandidates;
  const updateURL = capURLs.updateDossierPartages;

  return {
    listDossierPartageCandidates:
      listURL && listURL.includes(dossierIdURLParam)
        ? async (dossierId) => {
            const candidates: DossierPartageCandidate[] | undefined = await json(
              listURL.replace(dossierIdURLParam, String(dossierId)),
              { headers: { Accept: "application/json" } },
            );
            if (!candidates) {
              throw new TypeError(`Aucun service trouvé pour le dossier '${dossierId}'`);
            }
            return candidates;
          }
        : undefined,
    updateDossierPartages:
      updateURL && updateURL.includes(dossierIdURLParam)
        ? (dossierId, groupeIds) =>
            text(updateURL.replace(dossierIdURLParam, String(dossierId)), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ groupeIds }),
            }).then(() => undefined)
        : undefined,
  };
}
