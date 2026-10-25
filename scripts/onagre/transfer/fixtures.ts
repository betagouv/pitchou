import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import type { Knex } from "../../../libs/database/node_modules/knex/types/index.d.ts";
import { up as workspace } from "../../../libs/database/migrations/20261024120000_onagre-workspace.ts";
import { up as sourceRows } from "../../../libs/database/migrations/20261025120000_onagre-source-rows.ts";
import { up as reviewStatus } from "../../../libs/database/migrations/20261026120000_onagre-review-status.ts";
import { up as sharedRules } from "../../../libs/database/migrations/20261027120000_onagre-shared-rules.ts";
import { up as documents } from "../../../libs/database/migrations/20261028120000_onagre-documents.ts";
import { connectTo, type Connection } from "./connection.ts";

const knex = createRequire(new URL("../../../libs/database/package.json", import.meta.url))(
  "knex",
) as (options: unknown) => Knex;

export async function createFixture() {
  const base = process.env.ONAGRE_TRANSFER_TEST_ADMIN_URL;
  if (!base)
    throw new Error(
      "Set ONAGRE_TRANSFER_TEST_ADMIN_URL to a disposable local PostgreSQL admin URL.",
    );
  const url = new URL(base);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Transfer integration tests only create databases on loopback.");
  const prefix = `onagre_transfer_test_${process.pid}_${randomBytes(5).toString("hex")}`;
  const names = [`${prefix}_source`, `${prefix}_target`];
  const admin = connectTo(base);
  await admin.connect();
  const clients: Connection[] = [];
  const created: string[] = [];
  const cleanup = async () => {
    await Promise.all(clients.map((client) => client.end()));
    for (const name of created) await admin.query(`drop database "${name}" with (force)`);
    await admin.end();
  };
  try {
    for (const name of names) {
      await admin.query(`create database "${name}"`);
      created.push(name);
    }
    const urls = names.map((name) => {
      const value = new URL(base);
      value.pathname = `/${name}`;
      return value.href;
    });
    for (const connection of urls) {
      const client = connectTo(connection);
      await client.connect();
      clients.push(client);
      await createSchema(connection, client);
    }
    await populate(clients[0]);
    await clients[1].query(
      "insert into auth_user (id,email,first_names,active) values (40,'MATCHED@example.test','Target',true)",
    );
    return {
      source: clients[0],
      target: clients[1],
      sourceUrl: urls[0],
      targetUrl: urls[1],
      cleanup,
    };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

async function createSchema(url: string, client: Connection) {
  await client.query(`create table auth_user (
    id serial primary key, email text, first_names text, last_name text,
    active boolean not null default true, created_at timestamptz not null default now(),
    first_login_at timestamptz, last_login_at timestamptz,
    permissions_configured boolean not null default false);
    create unique index auth_user_email_unique on auth_user(lower(email)) where email is not null;
    create table auth_identity(user_id integer references auth_user(id), issuer text, subject text);
    create table auth_permission(user_id integer references auth_user(id), permission text);
    create table auth_permission_bundle(user_id integer references auth_user(id), bundle text);
    create table auth_permission_exclusion(user_id integer references auth_user(id), permission text);
    create table user_groupe(user_id integer references auth_user(id));
    create table session(user_id integer references auth_user(id), token text);
    create table dossier(id integer primary key, sentinel text);
    create table onagre_import_run(id integer primary key, sentinel text);
    create table onagre_import_identity(id integer primary key, sentinel text);`);
  const db = knex({ client: "pg", connection: url });
  try {
    for (const migrate of [workspace, sourceRows, reviewStatus, sharedRules, documents])
      await migrate(db);
  } finally {
    await db.destroy();
  }
}

async function populate(source: Connection) {
  await source.query(`insert into auth_user (id,email,first_names,last_name) values
    (3,'history@example.test','Historic','Actor'), (9,'matched@example.test','Source','Actor');
    insert into auth_permission_bundle values (3,'administrateur');
    insert into auth_identity values (3,'issuer','secret-subject');
    insert into session values (3,'secret-token');
    insert into dossier values (1,'must not transfer');
    insert into onagre_import_run values (1,'must not transfer');
    insert into onagre_import_identity values (1,'must not transfer');
    insert into onagre_snapshot (id,fingerprint,filename,workbook_fingerprint,tables,workbook_mappings,records_complete,created_at)
      values (17,repeat('a',64),'fixture.dump',repeat('b',64),'[]','[]',true,'2026-10-25 12:13:14.123456+00');
    insert into onagre_mapping (key,section,label,context,proposal,confidence,status,version)
      values ('field:fixture','fixture','label','context','proposal','high','validated',2);
    insert into onagre_mapping_revision (id,mapping_key,actor_id,before,after,created_at)
      values (29,'field:fixture',3,'{"version":1}','{"version":2}','2026-10-25 13:14:15.654321+00');
    insert into onagre_shared_rule_revision (id,rule_key,actor_id,before,after)
      values (39,'source',9,'{}','{}');
    update onagre_shared_rule set version=2,status='validated',updated_at=now() where key='source';
    insert into onagre_source_demande values (17,1,2,'code','name',repeat('c',64),'{"id":1}','{"id":2}');
    insert into onagre_source_row select 17,'fixture',n,jsonb_build_object('id',n,'text',E'é\\n\\t\\\\line','exact',9007199254740993::numeric)
      from generate_series(1,2501) n;
    insert into onagre_document (id,filename,fingerprint,size,mime,review,snapshot_id,original,text)
      values (23,'fixture.bin',repeat('d',64),5,'application/octet-stream','{}',17,decode('00ff5c0a09','hex'),E'é\\ntext');
    insert into onagre_document_sheet values (23,0,'Sheet',1,'["value"]');
    insert into onagre_document_row values (23,0,1,'[null,false,"",9007199254740993]');`);
}
