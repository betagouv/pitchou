import {
  isChampDSPieceJustificative,
  isChampRépétéDSPieceJustificative,
} from "../../scripts/types/typeguards.ts";

import type {
  DossierDS88444,
  ChampDSPieceJustificative,
  DSFile,
  ChampRépétéDSPieceJustificative,
} from "../../scripts/types/démarche-numérique/apiSchema.ts";
import type { ChampDescriptor } from "../../scripts/types/démarche-numérique/schema.ts";

export default function trouverCandidatsFichiersÀTélécharger(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
): Map<DossierDS88444["number"], DSFile[]> {
  const candidatsFichiers: Map<DossierDS88444["number"], DSFile[]> = new Map(
    // @ts-ignore
    dossiers
      .map(({ number, champs, annotations }) => {
        // @ts-ignore
        const champFichier:
          | ChampDSPieceJustificative
          | ChampRépétéDSPieceJustificative
          | undefined =
          champs.find((c) => c.id === champDescriptorId) ||
          annotations.find((c) => c.id === champDescriptorId);

        let descriptionFichiers: DSFile[] | undefined;

        if (isChampDSPieceJustificative(champFichier)) {
          descriptionFichiers = champFichier.files;
        }

        if (isChampRépétéDSPieceJustificative(champFichier)) {
          descriptionFichiers = champFichier.rows.map((r) => r.champs.map((c) => c.files)).flat(2);
        }

        return descriptionFichiers && descriptionFichiers.length >= 1
          ? [number, descriptionFichiers]
          : undefined;
      })
      .filter((x) => x !== undefined),
  );

  return candidatsFichiers;
}
