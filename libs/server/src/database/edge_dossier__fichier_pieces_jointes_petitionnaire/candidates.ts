import findCandidateFichiersToDownload from "@pitchou/common/findCandidateFichiersToDownload.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";
type FormField = keyof DossierDemarcheNumerique88444;

export function collectFileChecksums(
  dossiersDS: DossierDS88444[],
  dossierIdByDS_number: Map<DossierDS88444["number"], DossierId>,
  pitchouKeyToChampDS: Map<FormField, ChampDescriptor["id"]>,
  fieldsWithPiecesJointes: FormField[],
) {
  let fichierDescriptions: Map<DossierDS88444["number"], DSFile[]>[] = [];

  for (const field of fieldsWithPiecesJointes) {
    const fieldId: ChampDescriptor["id"] | undefined = pitchouKeyToChampDS.get(field);
    if (!fieldId) {
      throw new Error(`fieldId for ${field} is undefined`);
    }
    const candidate = findCandidateFichiersToDownload(dossiersDS, fieldId);

    fichierDescriptions.push(candidate);
  }

  const dossierIds: Set<DossierId> = new Set(
    dossiersDS
      .map(({ number }) => dossierIdByDS_number.get(number))
      .filter((id) => id !== undefined),
  );

  const checksumsByDossier = new Map<DossierId, Set<string>>();
  for (const descriptions of fichierDescriptions) {
    for (const [number, files] of descriptions) {
      const id = dossierIdByDS_number.get(number);
      if (!id) continue;
      const checksums = checksumsByDossier.get(id) ?? new Set<string>();
      for (const file of files) checksums.add(file.checksum);
      checksumsByDossier.set(id, checksums);
    }
  }

  return { dossierIds, checksumsByDossier };
}
