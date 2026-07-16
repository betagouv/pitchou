import { isChampDSPieceJustificative, isChampRepeteDSPieceJustificative } from "./typeguards.ts";

import type {
  DossierDS88444,
  ChampDSPieceJustificative,
  DSFile,
  ChampRepeteDSPieceJustificative,
} from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";

export default function findCandidateFichiersToDownload(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
): Map<DossierDS88444["number"], DSFile[]> {
  const candidateFichiers: Map<DossierDS88444["number"], DSFile[]> = new Map(
    // @ts-ignore
    dossiers
      .map(({ number, champs, annotations }) => {
        // @ts-ignore
        const champFichier:
          | ChampDSPieceJustificative
          | ChampRepeteDSPieceJustificative
          | undefined =
          champs.find((c) => c.id === champDescriptorId) ||
          annotations.find((c) => c.id === champDescriptorId);

        let descriptionFichiers: DSFile[] | undefined;

        if (isChampDSPieceJustificative(champFichier)) {
          descriptionFichiers = champFichier.files;
        }

        if (isChampRepeteDSPieceJustificative(champFichier)) {
          descriptionFichiers = champFichier.rows.map((r) => r.champs.map((c) => c.files)).flat(2);
        }

        return descriptionFichiers && descriptionFichiers.length >= 1
          ? [number, descriptionFichiers]
          : undefined;
      })
      .filter((x) => x !== undefined),
  );

  return candidateFichiers;
}
