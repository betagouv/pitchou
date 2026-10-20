import { preparePersonnes } from "./prepareDossiersForPersistence/personnes.ts";
import { prepareEntreprises } from "./prepareDossiersForPersistence/entreprises.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type {
  DossierEntreprisesPersonneInitializersForInsert,
  DossierEntreprisesPersonneInitializersForUpdate,
  DossierForInsert,
  DossierForUpdate,
} from "@pitchou/types/demarche-numerique/DossierForSynchronization.ts";
import type { Knex } from "knex";

type DossierWithInitializers =
  DossierEntreprisesPersonneInitializersForInsert | DossierEntreprisesPersonneInitializersForUpdate;

export async function prepareDossiersForPersistence(
  dossiersToInitializeForSync: DossierEntreprisesPersonneInitializersForInsert[],
  dossiersToUpdateForSync: DossierEntreprisesPersonneInitializersForUpdate[],
  transaction: Knex.Transaction,
): Promise<{
  dossiersToInitialize: DossierForInsert[];
  dossiersToUpdate: DossierForUpdate[];
  dossiersChangedByEntreprises: Set<DossierId>;
}> {
  const dossiers = [...dossiersToInitializeForSync, ...dossiersToUpdateForSync];
  const getPersonneId = await preparePersonnes(dossiers, transaction);
  const dossiersChangedByEntreprises = await prepareEntreprises(
    dossiers,
    dossiersToUpdateForSync,
    transaction,
  );

  const replacePersonneEntreprise = (dossierForSync: DossierWithInitializers) => {
    const {
      dossier: {
        deposant,
        demandeur_personne_physique,
        demandeur_personne_morale,
        identites: _identites,
        porteur_de_projet: _porteurDeProjet,
        acteurs: _acteurs,
        ...otherDossierProperties
      },
      ...otherTablesData
    } = dossierForSync;
    return {
      dossier: {
        deposant: getPersonneId(deposant) || null,
        demandeur_personne_physique: getPersonneId(demandeur_personne_physique) || null,
        demandeur_personne_morale: demandeur_personne_morale?.siret || null,
        ...otherDossierProperties,
      },
      ...otherTablesData,
    };
  };
  return {
    dossiersChangedByEntreprises,
    dossiersToInitialize: dossiersToInitializeForSync.map(
      (dossier) => replacePersonneEntreprise(dossier) as DossierForInsert,
    ),
    dossiersToUpdate: dossiersToUpdateForSync.map(
      (dossier) => replacePersonneEntreprise(dossier) as DossierForUpdate,
    ),
  };
}
