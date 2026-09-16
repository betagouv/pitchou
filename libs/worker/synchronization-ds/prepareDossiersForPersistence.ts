import { dumpEntreprises } from "@pitchou/server/database.ts";
import { createPersonnes, listAllPersonnes } from "@pitchou/server/database/personne.ts";
import { logActionsDossier } from "@pitchou/server/database/action_dossier.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type Entreprise from "@pitchou/types/database/public/Entreprise.ts";
import { companyPropertyLabels } from "@pitchou/types/notification.ts";
import type { ActionDossierInitializer } from "@pitchou/types/database/public/ActionDossier.ts";
import type Personne from "@pitchou/types/database/public/Personne.ts";
import type { PersonneInitializer } from "@pitchou/types/database/public/Personne.ts";
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
  const allPersonnes = await listAllPersonnes(transaction);
  const personneByEmail = new Map<Personne["email"], Personne>();
  for (const personne of allPersonnes) {
    if (personne.email) personneByEmail.set(personne.email, personne);
  }
  const dossiers = [...dossiersToInitializeForSync, ...dossiersToUpdateForSync];
  const personnesWithEmail = new Map<PersonneInitializer["email"], PersonneInitializer>();
  const personnesWithoutEmail = new Map<string, PersonneInitializer>();
  const collectPersonne = (personne: PersonneInitializer | undefined) => {
    if (!personne) return;
    if (personne.email) personnesWithEmail.set(personne.email, personne);
    else personnesWithoutEmail.set(`${personne.first_names}|${personne.last_name}`, personne);
  };
  for (const { dossier } of dossiers) {
    collectPersonne(dossier.deposant);
    collectPersonne(dossier.demandeur_personne_physique);
  }

  const getPersonneId = (personne: Personne | PersonneInitializer | undefined) => {
    if (!personne) return undefined;
    if (personne.id) return personne.id;
    if (personne.email) return personneByEmail.get(personne.email)?.id;
    return allPersonnes.find(
      ({ email, last_name, first_names }) =>
        !email && personne.last_name === last_name && personne.first_names === first_names,
    )?.id;
  };
  const personnesToCreate = [
    ...personnesWithEmail.values(),
    ...personnesWithoutEmail.values(),
  ].filter((personne) => !getPersonneId(personne));
  if (personnesToCreate.length >= 1) {
    const personneIds = await createPersonnes(personnesToCreate, transaction);
    personnesToCreate.forEach((personne, index) => {
      personne.id = personneIds[index].id;
      if (personne.email) personneByEmail.set(personne.email, personne as Personne);
      else allPersonnes.push(personne as Personne);
    });
  }

  const entreprisesBySiret = new Map<Entreprise["siret"], Entreprise>();
  for (const { dossier } of dossiers) {
    const entreprise = dossier.demandeur_personne_morale;
    if (!entreprise) continue;
    if (!entreprise.siret) {
      throw new TypeError(
        `Siret manquant pour l'entreprise ${JSON.stringify(entreprise)} (id_DN: ${dossier.demarche_numerique_id})`,
      );
    }
    entreprisesBySiret.set(entreprise.siret, entreprise as Entreprise);
  }
  const companyActions: ActionDossierInitializer[] = [];
  if (dossiersToUpdateForSync.length || entreprisesBySiret.size) {
    const current: (Entreprise & {
      dossier: DossierId;
      demarche_numerique_number: string;
      source: string;
    })[] = await transaction("dossier as d")
      .leftJoin("entreprise as e", "e.siret", "d.demandeur_personne_morale")
      .select("e.*", "d.id as dossier", "d.demarche_numerique_number", "d.source")
      .where(function () {
        this.where(function () {
          this.where("d.source", "demarche_numerique").whereIn(
            "d.demarche_numerique_number",
            dossiersToUpdateForSync
              .map(({ dossier }) => dossier.demarche_numerique_number)
              .filter((number) => number != null),
          );
        }).orWhereIn("d.demandeur_personne_morale", [...entreprisesBySiret.keys()]);
      });
    const incomingByNumber = new Map(
      dossiersToUpdateForSync.map(({ dossier }) => [
        dossier.demarche_numerique_number,
        dossier.demandeur_personne_morale,
      ]),
    );
    const storedCompanies: Entreprise[] = entreprisesBySiret.size
      ? await transaction("entreprise")
          .select("*")
          .whereIn("siret", [...entreprisesBySiret.keys()])
      : [];
    const storedBySiret = new Map(storedCompanies.map((company) => [company.siret, company]));
    const writtenProperties = new Set([...entreprisesBySiret.values()].flatMap(Object.keys));
    for (const row of current) {
      const inBatch =
        row.source === "demarche_numerique" && incomingByNumber.has(row.demarche_numerique_number);
      const targetSiret = inBatch
        ? incomingByNumber.get(row.demarche_numerique_number)?.siret
        : row.siret;
      // Knex writes the union of the batch's columns. Missing values in those
      // columns become NULL; columns absent from the entire batch are retained.
      const after = targetSiret
        ? {
            ...storedBySiret.get(targetSiret),
            ...Object.fromEntries(
              [...writtenProperties].map((property) => [
                property,
                entreprisesBySiret.get(targetSiret)?.[property as keyof Entreprise] ?? null,
              ]),
            ),
          }
        : null;
      for (const property of Object.keys(companyPropertyLabels) as (keyof Entreprise)[]) {
        const from = row[property] || null;
        const to = after?.[property] || null;
        if (from === to) continue;
        const label = `Entreprise : ${companyPropertyLabels[property]}`;
        companyActions.push({
          dossier: row.dossier,
          type: "champ_modifie",
          author_petitionnaire: true,
          data: {
            field: label,
            label,
            notification_field: `entreprise.${property}`,
            from,
            to,
            notification: true,
          },
        });
      }
    }
    await logActionsDossier(companyActions, transaction);
  }
  if (entreprisesBySiret.size >= 1) {
    await dumpEntreprises([...entreprisesBySiret.values()], transaction);
  }

  const replacePersonneEntreprise = (dossierForSync: DossierWithInitializers) => {
    const {
      dossier: {
        deposant,
        demandeur_personne_physique,
        demandeur_personne_morale,
        identites: _identites,
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
    dossiersChangedByEntreprises: new Set(companyActions.map(({ dossier }) => dossier)),
    dossiersToInitialize: dossiersToInitializeForSync.map(
      (dossier) => replacePersonneEntreprise(dossier) as DossierForInsert,
    ),
    dossiersToUpdate: dossiersToUpdateForSync.map(
      (dossier) => replacePersonneEntreprise(dossier) as DossierForUpdate,
    ),
  };
}
