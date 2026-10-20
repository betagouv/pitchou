import type { Knex } from "knex";
import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";
import type { DossierId } from "@pitchou/types/database/public/Dossier.ts";
import type { DossierActeurData } from "@pitchou/types/dossierActeur.ts";
import type { PorteurDeProjetInitializer } from "@pitchou/types/porteurDeProjet.ts";
import { savePorteursDeProjetAndActeurs } from "../dossier_acteur.ts";
import {
  deleteUnreferencedDossierPersonnes,
  updateOrInsertDossierPersonne,
} from "./relationPersonnes.ts";
import type { AdminDossierIdentite, AdminDossierRelations } from "./relationTypes.ts";

export { deleteUnreferencedDossierPersonnes };

// A personne physique without last or first name is not a porteur yet.
function porteurDeProjetFromRelations(
  relations: AdminDossierRelations,
): PorteurDeProjetInitializer {
  if (relations.demandeur_type === "personne_morale") {
    return { type: "personne_morale", siret: relations.demandeur_personne_morale.siret };
  }
  const { last_name, first_names, email, address, phone, role } =
    relations.demandeur_personne_physique;
  if (!last_name.trim() && !first_names.trim()) return undefined;
  return {
    type: "personne_physique",
    last_name: last_name.trim() || null,
    first_names: first_names.trim() || null,
    email: email ? normalizeEmail(email) : null,
    address,
    phone,
    role,
  };
}

function acteurPersonne({ last_name, first_names, email, phone, role }: AdminDossierIdentite) {
  return {
    last_name,
    first_names,
    email: email ? normalizeEmail(email) : null,
    address: null,
    phone,
    role,
  };
}

/**
 * The mandataire is the déposant; without mandataire, the déposant is the porteur personne
 * physique, or the demandeur identity of a personne morale. The représentant is the
 * personne contact.
 */
function acteursFromRelations(relations: AdminDossierRelations): DossierActeurData[] {
  const identite = (type: AdminDossierIdentite["type"]) =>
    relations.identites.find((item) => item.type === type);
  const mandataire = identite("mandataire");
  const demandeur = identite("demandeur");
  const personneContact = identite("representant");
  const acteurs: DossierActeurData[] = [];
  if (mandataire) {
    acteurs.push({
      involvements: ["mandataire", "deposant"],
      personne: acteurPersonne(mandataire),
    });
  } else if (relations.demandeur_type === "personne_physique") {
    acteurs.push({ involvements: ["deposant"], porteur: true });
  } else if (demandeur) {
    acteurs.push({ involvements: ["deposant"], personne: acteurPersonne(demandeur) });
  }
  if (personneContact) {
    acteurs.push({ involvements: ["personne_contact"], personne: acteurPersonne(personneContact) });
  }
  return acteurs;
}

async function savePorteurDeProjetAndActeurs(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  await savePorteursDeProjetAndActeurs(
    new Map([[dossierId, porteurDeProjetFromRelations(relations)]]),
    new Map([[dossierId, acteursFromRelations(relations)]]),
    trx,
    { historique: false },
  );
}

export async function updateDossierAdminRelations(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  const current = await trx("dossier")
    .select("demandeur_personne_physique")
    .where({ id: dossierId })
    .first();
  if (!current) throw new TypeError(`Unknown dossier: ${dossierId}`);
  if (
    !(await trx("groupe_instructeurs")
      .select("id")
      .where({ id: relations.groupe_instructeurs })
      .first())
  ) {
    throw new TypeError(`Unknown groupe_instructeurs: ${relations.groupe_instructeurs}`);
  }
  await replaceDossierRelations(dossierId, relations, trx);
  if (relations.demandeur_type === "personne_physique") {
    const { last_name, first_names, email } = relations.demandeur_personne_physique;
    const personneId = await updateOrInsertDossierPersonne(
      current.demandeur_personne_physique,
      dossierId,
      { last_name, first_names, email },
      trx,
    );
    await trx("dossier").where({ id: dossierId }).update({
      demandeur_personne_physique: personneId,
      demandeur_personne_morale: null,
    });
    await deleteUnreferencedDossierPersonnes(
      [current.demandeur_personne_physique].filter((id) => id !== personneId),
      trx,
    );
    await savePorteurDeProjetAndActeurs(dossierId, relations, trx);
    return;
  }
  const entreprise = relations.demandeur_personne_morale;
  await trx("entreprise")
    .insert({ ...entreprise, siren: entreprise.siret.slice(0, 9) })
    .onConflict("siret")
    .ignore();
  if (entreprise.legal_name) {
    await trx("entreprise")
      .where({ siret: entreprise.siret })
      .whereNull("legal_name")
      .update({ legal_name: entreprise.legal_name });
  }
  await trx("dossier").where({ id: dossierId }).update({
    demandeur_personne_physique: null,
    demandeur_personne_morale: entreprise.siret,
  });
  await deleteUnreferencedDossierPersonnes([current.demandeur_personne_physique], trx);
  // After the entreprise insert above, so that its details are kept.
  await savePorteurDeProjetAndActeurs(dossierId, relations, trx);
}

async function replaceDossierRelations(
  dossierId: DossierId,
  relations: AdminDossierRelations,
  trx: Knex.Transaction,
): Promise<void> {
  await trx("edge_groupe_instructeurs__dossier").where({ dossier: dossierId }).delete();
  await trx("edge_groupe_instructeurs__dossier").insert({
    dossier: dossierId,
    groupe_instructeurs: relations.groupe_instructeurs,
  });
  // Still written while identite_dossier is replaced by dossier_acteur; to be removed soon.
  await trx("identite_dossier").where({ dossier: dossierId }).delete();
  if (relations.identites.length > 0) {
    await trx("identite_dossier").insert(
      relations.identites.map((identite) => ({
        ...identite,
        dossier: dossierId,
        email: identite.email ? normalizeEmail(identite.email) : null,
      })),
    );
  }
}
