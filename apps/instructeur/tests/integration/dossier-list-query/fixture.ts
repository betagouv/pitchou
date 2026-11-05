import type { Knex } from "knex";
import type { UserId } from "@pitchou/types/permissions.ts";
import { changeDossierAccess } from "@pitchou/server/dossierRouting.ts";
import {
  createDossier,
  createGroupeInstructeurs,
  type CreatedDossier,
} from "../../factories/dossier.ts";

export async function seedList(db: Knex) {
  const [user, other, anonymous] = await db("auth_user")
    .insert([{ email: "élise@example.org" }, { email: "colleague@example.org" }, { email: null }])
    .returning("id");
  await db("auth_permission").insert(
    ["dossier:read", "dossier:instruct"].map((permission) => ({ user_id: user.id, permission })),
  );
  const group = await createGroupeInstructeurs(db);
  await db("user_groupe").insert({ user_id: user.id, groupe_instructeurs: group.id });
  const dossiers: CreatedDossier[] = [];
  for (let i = 0; i < 35; i++)
    dossiers.push(
      await createDossier(db, {
        name: `Projet ${i}`,
        depot_date: i === 34 ? null : new Date(`2025-01-${String((i % 28) + 1).padStart(2, "0")}`),
        departments: JSON.stringify([i % 2 ? "24" : "33"]),
        main_activite: i % 2 ? "Activité introuvable" : "Demande scientifique",
        next_due_date: i % 3 ? new Date("2026-01-15") : null,
        next_action_expected_from: i % 2 ? "Instructeur" : "Pétitionnaire",
        enjeu: i % 3 === 0,
      }),
    );
  const [project] = await db("dossier_projet")
    .insert({ name: "Parc éolien commun" })
    .returning("id");
  await db("dossier_demande").insert(
    dossiers
      .slice(0, 3)
      .map(({ id }, i) => ({ dossier: id, projet: project.id, label: `Demande éolienne ${i}` })),
  );
  await changeDossierAccess(db, (trx) =>
    trx("dossier_user_access").insert(
      dossiers.slice(0, 32).map(({ id }, i) => ({
        dossier: id,
        user_id: user.id,
        access_level: i % 5 ? "instruct" : "read",
      })),
    ),
  );
  await db("notification_arrival").delete();
  await db("notification").delete();
  await db("edge_personne_follows_dossier").insert([
    { dossier: dossiers[15].id, personne: anonymous.id },
    ...[1, 4, 5, 33].map((i) => ({ dossier: dossiers[i].id, personne: user.id })),
    ...[0, 4, 32, 33].map((i) => ({ dossier: dossiers[i].id, personne: other.id })),
  ]);
  await db("commentaire").insert([
    {
      dossier: dossiers[4].id,
      personne: user.id,
      content: "Ancien commentaire",
      created_at: new Date("2025-01-01"),
    },
    {
      dossier: dossiers[4].id,
      personne: user.id,
      content: "Rivière précieuse",
      created_at: new Date("2025-02-01"),
    },
    {
      dossier: dossiers[33].id,
      personne: user.id,
      content: "Confidentiel commentaire",
      created_at: new Date("2025-02-01"),
    },
  ]);
  await db("dossier")
    .where({ id: dossiers[4].id })
    .update({
      communes: JSON.stringify([{ name: "Bordeaux", postalCode: "33000" }]),
      regions: JSON.stringify(["Nouvelle-Aquitaine"]),
      onagre_demande_identifier: "2026-0042",
      demarche_numerique_number: "987654321",
    });
  const [physical] = await db("personne_physique")
    .insert({ first_names: "Hélène", last_name: "Porteuse" })
    .returning("id");
  const [porteur] = await db("porteur_de_projet")
    .insert({ personne_physique: physical.id })
    .returning("id");
  await db("dossier").where({ id: dossiers[4].id }).update({ porteur_de_projet: porteur.id });
  const [actor] = await db("personne_physique")
    .insert({ first_names: "Gérard", last_name: "Mandataire" })
    .returning("id");
  await db("dossier_acteur").insert({
    dossier: dossiers[4].id,
    personne_physique: actor.id,
    involvement: "mandataire",
  });
  const [file] = await db("file").insert({ name: "test.ods", size: "1" }).returning("id");
  await db("decision_administrative").insert([
    { dossier: dossiers[4].id, number: "Arrêté-42", fichier: file.id },
    { dossier: dossiers[5].id, number: "Sans fichier" },
  ]);
  await db("avis_expert").insert([
    { dossier: dossiers[4].id, expert: "CNPN", avis_fichier: file.id },
    { dossier: dossiers[5].id, expert: "Autre expert", avis_fichier: file.id },
  ]);
  await db("espece_protegee_reference").insert({
    cd_ref: "12345",
    classification: "oiseau",
    noms_vernaculaires: ["Héron"],
    noms_scientifiques: ["Ardea cinerea"],
  });
  await db("impact_espece").insert({
    dossier: dossiers[4].id,
    cd_ref: "12345",
    classification: "oiseau",
    source_file: file.id,
  });
  await db("evenement_phase_dossier").insert([
    {
      dossier: dossiers[4].id,
      phase: "Instruction",
      timestamp: null,
      recorded_at: new Date("2026-01-01"),
    },
    { dossier: dossiers[5].id, phase: "Instruction", timestamp: new Date("2025-02-01") },
  ]);
  await db("notification_arrival")
    .insert({ dossier: dossiers[5].id, created_at: new Date("2025-02-01") })
    .onConflict("dossier")
    .merge();
  await db("notification")
    .insert([
      {
        dossier: dossiers[4].id,
        personne: user.id,
        follow_revision: "00000000-0000-4000-8000-000000000001",
        follow_at: new Date("2025-03-01"),
      },
      {
        dossier: dossiers[6].id,
        personne: user.id,
        arrival_viewed: true,
        receive_legacy_changes: false,
      },
      {
        dossier: dossiers[7].id,
        personne: user.id,
        arrival_viewed: true,
        receive_legacy_changes: true,
      },
    ])
    .onConflict(["dossier", "personne"])
    .merge();
  const actions = await db("action_dossier")
    .insert(
      [4, 6, 7, 8].map((i) => ({
        dossier: dossiers[i].id,
        type: "modified",
        author_petitionnaire: true,
        data: {
          notification: true,
          notification_field: "name",
          notification_legacy: i === 6 || i === 7,
        },
        created_at: new Date(`2025-03-${String(i).padStart(2, "0")}`),
      })),
    )
    .returning("id");
  await db("notification_review").insert({ action: actions[3].id, personne: user.id });
  return { user: user.id as UserId, dossiers, project };
}
