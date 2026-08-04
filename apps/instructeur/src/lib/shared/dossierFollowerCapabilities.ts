import { json, text } from "d3-fetch";
import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  DossierFollowerCandidate,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";

const dossierIdURLParam = ":dossierId";

export function createDossierFollowerCapabilities(
  capURLs: StringValues<
    Pick<PitchouInstructeurCapabilities, "listDossierFollowerCandidates" | "updateDossierFollowers">
  >,
): Pick<
  Partial<PitchouInstructeurCapabilities>,
  "listDossierFollowerCandidates" | "updateDossierFollowers"
> {
  const listURL = capURLs.listDossierFollowerCandidates;
  const updateURL = capURLs.updateDossierFollowers;

  return {
    listDossierFollowerCandidates:
      listURL && listURL.includes(dossierIdURLParam)
        ? async (dossierId) => {
            const candidates: DossierFollowerCandidate[] | undefined = await json(
              listURL.replace(dossierIdURLParam, String(dossierId)),
              { headers: { Accept: "application/json" } },
            );
            if (!candidates) {
              throw new TypeError(`Aucun instructeur trouvé pour le dossier '${dossierId}'`);
            }
            return candidates;
          }
        : undefined,
    updateDossierFollowers:
      updateURL && updateURL.includes(dossierIdURLParam)
        ? (dossierId, personneEmails) =>
            text(updateURL.replace(dossierIdURLParam, String(dossierId)), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ personneEmails }),
            }).then(() => undefined)
        : undefined,
  };
}
