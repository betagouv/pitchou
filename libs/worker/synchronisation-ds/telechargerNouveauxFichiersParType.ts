import findCandidateFichiersToDownload from "@pitchou/common/trouverCandidatsFichiersATelecharger.ts";
import downloadNewFichiers from "./telechargerNouveauxFichiers.ts";

import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { Knex } from "knex";

export async function downloadNewFichiersFromChampId(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]> | undefined> {
  const candidateFichiers: Map<DossierDS88444["number"], DSFile[]> =
    findCandidateFichiersToDownload(dossiers, champDescriptorId);

  if (candidateFichiers.size >= 1) {
    return downloadNewFichiers(candidateFichiers, synchronizationTransactionDS);
  }
}

export async function downloadNewFichiersEspecesImpactees(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidateFichiersEspecesImpactees: Map<DossierDS88444["number"], DSFile[]> =
    findCandidateFichiersToDownload(dossiers, champDescriptorId);

  // console.log('candidateFichiersImpactées', candidateFichiersImpactées)

  if (candidateFichiersEspecesImpactees.size >= 1) {
    // keep only the first file and ignore the others

    let candidateFichiersEspecesImpacteesOnePerChamp: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidateFichiersEspecesImpactees].map(([number, fichierDescription]) => [
          number,
          [fichierDescription[0]],
        ]),
      );

    return downloadNewFichiers(
      candidateFichiersEspecesImpacteesOnePerChamp,
      synchronizationTransactionDS,
    ).then((newFichiers) => {
      return new Map([...newFichiers].map(([number, [id]]) => [number, id]));
    });
  }
}

export async function downloadNewFichiersMotivation(
  dossiers: DossierDS88444[],
  synchronizationTransactionDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidateFichiersMotivation: Map<DossierDS88444["number"], DSFile> = new Map(
    dossiers.filter((d) => !!d.motivationAttachment).map((d) => [d.number, d.motivationAttachment]),
  );

  //console.log('candidateFichiersMotivation', candidateFichiersMotivation.size)

  if (candidateFichiersMotivation.size >= 1) {
    // keep only the first file and ignore the others
    let candidateFichiersMotivationForDownload: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidateFichiersMotivation].map(([number, fichierDescription]) => [
          number,
          [fichierDescription],
        ]),
      );

    return downloadNewFichiers(
      candidateFichiersMotivationForDownload,
      synchronizationTransactionDS,
    ).then((newFichiers) => {
      return new Map([...newFichiers].map(([number, [id]]) => [number, id]));
    });
  }
}
