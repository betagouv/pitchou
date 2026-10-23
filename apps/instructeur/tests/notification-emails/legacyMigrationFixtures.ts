import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { beforeAll, afterAll, beforeEach } from "vitest";
import { makeAdminKnex, makeKnex } from "../setup/db.ts";
import { truncateAll } from "../setup/truncate.ts";

const name = "pitchou_test_legacy_notifications";
export const db = makeKnex(name);
const directory = new URL("../../../../libs/database/migrations/", import.meta.url);

beforeAll(async () => {
  const admin = makeAdminKnex();
  try {
    await admin.raw("DROP DATABASE IF EXISTS ??", [name]);
    await admin.raw("CREATE DATABASE ??", [name]);
    const names = (await readdir(directory))
      .filter((file) => file.endsWith(".ts") && file < "20261023")
      .sort();
    await db.migrate.latest({
      migrationSource: {
        getMigrations: async () => names,
        getMigrationName: (file: string) => file,
        getMigration: (file: string) =>
          // eslint-disable-next-line no-inline-comments
          import(/* @vite-ignore */ fileURLToPath(new URL(file, directory))),
      },
    });
  } finally {
    await admin.destroy();
  }
}, 60_000);
beforeEach(() => truncateAll(db));
afterAll(async () => {
  await db.destroy();
  const admin = makeAdminKnex();
  try {
    await admin.raw("DROP DATABASE IF EXISTS ??", [name]);
  } finally {
    await admin.destroy();
  }
}, 60_000);

export async function setupArrival() {
  const [member] = await db("personne")
    .insert({ email: "legacy@test.fr", access_code: "legacy" })
    .returning("*");
  const [cap] = await db("cap_dossier").insert({ personne_cap: member.access_code }).returning("*");
  const [group] = await db("groupe_instructeurs")
    .insert({ name: "Legacy", demarche_number: 88444 })
    .returning("*");
  await db("edge_cap_dossier__groupe_instructeurs").insert({
    cap_dossier: cap.cap,
    groupe_instructeurs: group.id,
  });
  const [dossier] = await db("dossier")
    .insert({
      name: "Legacy dossier",
      source: "demarche_numerique",
      depot_date: new Date(),
      demarche_number: 88444,
    })
    .returning("*");
  const arrive = () =>
    db("edge_groupe_instructeurs__dossier").insert({
      dossier: dossier.id,
      groupe_instructeurs: group.id,
    });
  return { member: { ...member, groupeId: group.id }, dossier, arrive };
}

export async function setup() {
  const { member, dossier, arrive } = await setupArrival();
  await arrive();
  const [recipient] = await db("personne").insert({ email: "recipient@test.fr" }).returning("*");
  await db("edge_personne_follows_dossier").insert({ personne: recipient.id, dossier: dossier.id });
  if (await db.schema.hasTable("email_notification_outbox"))
    await db("email_notification_outbox").delete();
  const action = (type: string) =>
    db("action_dossier").insert({ dossier: dossier.id, author_personne: member.id, type });
  return { actor: { ...member, dossier }, recipient, action };
}
