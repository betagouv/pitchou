import trouverCandidatsFichiersÀTélécharger from "@pitchou/common/trouverCandidatsFichiersÀTélécharger.ts";
import téléchargerNouveauxFichiers from "./téléchargerNouveauxFichiers.ts";

import type { DossierDS88444, DSFile } from "@pitchou/types/démarche-numérique/apiSchema.ts";
import type { FileId } from "@pitchou/types/database/public/File.ts";
import type { ChampDescriptor } from "@pitchou/types/démarche-numérique/schema.ts";
import type { Knex } from "knex";

export async function téléchargerNouveauxFichiersFromChampId(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId[]> | undefined> {
  const candidatsFichiers: Map<DossierDS88444["number"], DSFile[]> =
    trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId);

  if (candidatsFichiers.size >= 1) {
    return téléchargerNouveauxFichiers(candidatsFichiers, laTransactionDeSynchronisationDS);
  }
}

export async function téléchargerNouveauxFichiersEspècesImpactées(
  dossiers: DossierDS88444[],
  champDescriptorId: ChampDescriptor["id"],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidatsFichiersEspècesImpactées: Map<DossierDS88444["number"], DSFile[]> =
    trouverCandidatsFichiersÀTélécharger(dossiers, champDescriptorId);

  // console.log('candidatsFichiersImpactées', candidatsFichiersImpactées)

  if (candidatsFichiersEspècesImpactées.size >= 1) {
    // ne garder que le premier fichier et ignorer les autres

    let candidatsFichiersEspècesImpactéesUnParChamp: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidatsFichiersEspècesImpactées].map(([number, descriptionFichier]) => [
          number,
          [descriptionFichier[0]],
        ]),
      );

    return téléchargerNouveauxFichiers(
      candidatsFichiersEspècesImpactéesUnParChamp,
      laTransactionDeSynchronisationDS,
    ).then((nouveauxFichiers) => {
      return new Map([...nouveauxFichiers].map(([numéro, [id]]) => [numéro, id]));
    });
  }
}

export async function téléchargerNouveauxFichiersMotivation(
  dossiers: DossierDS88444[],
  laTransactionDeSynchronisationDS: Knex.Transaction | Knex,
): Promise<Map<DossierDS88444["number"], FileId> | undefined> {
  const candidatsFichiersMotivation: Map<DossierDS88444["number"], DSFile> = new Map(
    dossiers.filter((d) => !!d.motivationAttachment).map((d) => [d.number, d.motivationAttachment]),
  );

  //console.log('candidatsFichiersMotivation', candidatsFichiersMotivation.size)

  if (candidatsFichiersMotivation.size >= 1) {
    // ne garder que le premier fichier et ignorer les autres
    let candidatsFichiersMotivationPourTéléchargement: Map<DossierDS88444["number"], DSFile[]> =
      new Map(
        [...candidatsFichiersMotivation].map(([number, descriptionFichier]) => [
          number,
          [descriptionFichier],
        ]),
      );

    return téléchargerNouveauxFichiers(
      candidatsFichiersMotivationPourTéléchargement,
      laTransactionDeSynchronisationDS,
    ).then((nouveauxFichiers) => {
      return new Map([...nouveauxFichiers].map(([numéro, [id]]) => [numéro, id]));
    });
  }
}
