import trouverCandidatsFichiersATelecharger from "@pitchou/common/trouverCandidatsFichiersATelecharger.ts";
import telechargerNouveauxFichiers from "./telechargerNouveauxFichiers.ts";

import type { DossierDS88444, DSFile } from "@pitchou/types/demarche-numerique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { ChampDescriptor } from "@pitchou/types/demarche-numerique/schema.ts";
import type { Knex } from "knex";

export async function telechargerNouveauxFichiersFromChampId(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]> | undefined> {
  const candidatsFichiers: Map<DossierDS88444["number"], DSFile[]> =
    trouverCandidatsFichiersATelecharger(dossiers, champDescriptorId);

  if (candidatsFichiers.size >= 1) {
    return telechargerNouveauxFichiers(candidatsFichiers, laTransactionDeSynchronisationDS);
  }
}

export async function telechargerNouveauxFichiersEspecesImpactees(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidatsFichiersEspecesImpactees: Map<DossierDS88444["number"], DSFile[]> =
    trouverCandidatsFichiersATelecharger(dossiers, champDescriptorId);

  // console.log('candidatsFichiersImpactées', candidatsFichiersImpactées)

  if (candidatsFichiersEspecesImpactees.size >= 1) {
    // keep only the first file and ignore the others

    let candidatsFichiersEspecesImpacteesUnParChamp: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidatsFichiersEspecesImpactees].map(([number, descriptionFichier]) => [
          number,
          [descriptionFichier[0]],
        ]),
      );

    return telechargerNouveauxFichiers(
      candidatsFichiersEspecesImpacteesUnParChamp,
      laTransactionDeSynchronisationDS,
    ).then((nouveauxFichiers) => {
      return new Map([...nouveauxFichiers].map(([numéro, [id]]) => [numéro, id]));
    });
  }
}

export async function telechargerNouveauxFichiersMotivation(
  dossiers: DossierDS88444[],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidatsFichiersMotivation: Map<DossierDS88444["number"], DSFile> = new Map(
    dossiers.filter((d) => !!d.motivationAttachment).map((d) => [d.number, d.motivationAttachment]),
  );

  //console.log('candidatsFichiersMotivation', candidatsFichiersMotivation.size)

  if (candidatsFichiersMotivation.size >= 1) {
    // keep only the first file and ignore the others
    let candidatsFichiersMotivationPourTelechargement: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidatsFichiersMotivation].map(([number, descriptionFichier]) => [
          number,
          [descriptionFichier],
        ]),
      );

    return telechargerNouveauxFichiers(
      candidatsFichiersMotivationPourTelechargement,
      laTransactionDeSynchronisationDS,
    ).then((nouveauxFichiers) => {
      return new Map([...nouveauxFichiers].map(([numéro, [id]]) => [numéro, id]));
    });
  }
}
