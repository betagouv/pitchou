import { json, text } from "d3-fetch";
import type { StringValues } from "@pitchou/types/tools.d.ts";
import type {
  DossierAction,
  DossierCommentaire,
  PitchouInstructeurCapabilities,
} from "@pitchou/types/capabilities.ts";

const dossierIdURLParam = ":dossierId";

type CommentaireCapabilityNames =
  "listerCommentaires" | "ajouterCommentaire" | "modifierCommentaire" | "listerActionsDossier";

export function createDossierCommentaireCapabilities(
  capURLs: StringValues<Pick<PitchouInstructeurCapabilities, CommentaireCapabilityNames>>,
): Pick<Partial<PitchouInstructeurCapabilities>, CommentaireCapabilityNames> {
  const listURL = capURLs.listerCommentaires;
  const addURL = capURLs.ajouterCommentaire;
  const updateURL = capURLs.modifierCommentaire;
  const actionsURL = capURLs.listerActionsDossier;

  return {
    listerActionsDossier:
      actionsURL && actionsURL.includes(dossierIdURLParam)
        ? async (dossierId) => {
            const actions: DossierAction[] | undefined = await json(
              actionsURL.replace(dossierIdURLParam, String(dossierId)),
              { headers: { Accept: "application/json" } },
            );
            return actions ?? [];
          }
        : undefined,
    listerCommentaires:
      listURL && listURL.includes(dossierIdURLParam)
        ? async (dossierId) => {
            const commentaires: DossierCommentaire[] | undefined = await json(
              listURL.replace(dossierIdURLParam, String(dossierId)),
              { headers: { Accept: "application/json" } },
            );
            return commentaires ?? [];
          }
        : undefined,
    ajouterCommentaire:
      addURL && addURL.includes(dossierIdURLParam)
        ? async (dossierId, content) => {
            const commentaire: DossierCommentaire | undefined = await json(
              addURL.replace(dossierIdURLParam, String(dossierId)),
              {
                method: "POST",
                headers: { "Content-Type": "application/json", Accept: "application/json" },
                body: JSON.stringify({ content }),
              },
            );
            if (!commentaire) {
              throw new TypeError(`Le commentaire n'a pas pu être ajouté au dossier ${dossierId}`);
            }
            return commentaire;
          }
        : undefined,
    modifierCommentaire:
      updateURL && updateURL.includes(dossierIdURLParam)
        ? (dossierId, { id, content }) =>
            text(updateURL.replace(dossierIdURLParam, String(dossierId)), {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ id, content }),
            }).then(() => undefined)
        : undefined,
  };
}
