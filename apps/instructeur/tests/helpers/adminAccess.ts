import type { Knex } from "knex";
import {
  createDossier,
  createGroupeInstructeurs,
  createInstructeurWithCapToGroup,
} from "../factories/index.ts";

export async function createAdminAccessFixture(db: Knex) {
  const actor = await createInstructeurWithCapToGroup(db, { email: "admin@example.org" });
  await db("auth_permission_bundle").insert({ user_id: actor.id, bundle: "administrateur" });
  const member = await createInstructeurWithCapToGroup(db, {
    email: "camille.instruction@example.org",
    nomGroupe: "Service régional de la biodiversité",
  });
  await db("groupe_departement").insert({
    groupe_instructeurs: member.groupeId,
    department: "75",
  });
  const dossier = await createDossier(db, {
    name: "Projet de démonstration des accès",
    primary_department: "75",
  });
  const manual = await createGroupeInstructeurs(db, { name: "Expertise nationale" });
  const excluded = await createGroupeInstructeurs(db, { name: "Service exclu du dossier" });
  const archived = await createGroupeInstructeurs(db, { name: "Ancien service territorial" });
  await createGroupeInstructeurs(db, { name: "Consultation complémentaire" });
  await db("groupe_instructeurs").where({ id: archived.id }).update({ active: false });
  await db("groupe_dossier_override").insert([
    {
      dossier: dossier.id,
      groupe_instructeurs: manual.id,
      mode: "include",
      access_level: "read",
    },
    {
      dossier: dossier.id,
      groupe_instructeurs: excluded.id,
      mode: "exclude",
      access_level: "instruct",
    },
    {
      dossier: dossier.id,
      groupe_instructeurs: archived.id,
      mode: "include",
      access_level: "instruct",
    },
  ]);
  const [inactive, newcomer] = await db("auth_user")
    .insert([
      { email: "compte.inactif@example.org", active: false, permissions_configured: true },
      { email: "nouvelle.personne@example.org", active: true, permissions_configured: true },
    ])
    .returning("id");
  await db("auth_permission_bundle").insert([
    { user_id: inactive.id, bundle: "instructeur" },
    { user_id: newcomer.id, bundle: "instructeur" },
  ]);
  await db("dossier_user_access").insert([
    { dossier: dossier.id, user_id: member.id, access_level: "read" },
    { dossier: dossier.id, user_id: inactive.id, access_level: "instruct" },
  ]);
  return { actor, member, dossier, manual, excluded, archived, newcomer };
}
