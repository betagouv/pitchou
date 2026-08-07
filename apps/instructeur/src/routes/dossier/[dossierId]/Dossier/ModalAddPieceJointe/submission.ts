import { addOtherAttachment } from "../otherAttachment.ts";
import { addOrUpdateAvisExpert } from "../avisExpert.ts";
import { refreshDossierFull } from "$lib/dossier/dossier.ts";
import type { DossierFull, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

export type TypePieceJointe =
  "Décision administrative" | "Avis expert" | "Saisine expert" | "Autre";
type Values = {
  dossier: Pick<DossierFull, "id" | "avisExpert">;
  files: FileList;
  type: TypePieceJointe | null;
  expert: string | null;
  otherExpert: string | null;
  avis: string | null;
  saisineDate?: Date | null;
  avisDate?: Date | null;
  selectedAvis: FrontEndAvisExpert["id"] | "nouvel-avis-expert" | null;
  otherType: string;
  otherDate?: Date | null;
  track: (type: TypePieceJointe, count: number) => void;
  close: () => void;
};

export async function savePieceJointe(values: Values): Promise<void> {
  const { dossier, files, type, selectedAvis } = values;
  if (type === "Saisine expert") {
    const expert = values.expert === "Autre expert" ? values.otherExpert : values.expert;
    await addOrUpdateAvisExpert(
      { dossier: dossier.id, expert, saisine_date: values.saisineDate },
      files[0],
      undefined,
    );
    values.track(type, 1);
  } else if (type === "Avis expert") {
    if (selectedAvis === "nouvel-avis-expert") {
      const expert = values.expert === "Autre expert" ? values.otherExpert : values.expert;
      await addOrUpdateAvisExpert(
        {
          dossier: dossier.id,
          expert,
          avis: values.avis,
          saisine_date: values.saisineDate,
          avis_date: values.avisDate,
        },
        undefined,
        files[0],
      );
    } else {
      const existing = dossier.avisExpert.find((item) => item.id === selectedAvis);
      if (!existing) return;
      await addOrUpdateAvisExpert(
        {
          id: existing.id,
          dossier: dossier.id,
          expert: existing.expert,
          avis_date: values.avisDate,
          avis: values.avis,
        },
        undefined,
        files[0],
      );
    }
    values.track(type, 1);
  } else if (type === "Autre") {
    await addOtherAttachment(dossier.id, values.otherType, values.otherDate, files);
    values.track(type, files.length);
  } else return;
  await refreshDossierFull(dossier.id);
  values.close();
}
