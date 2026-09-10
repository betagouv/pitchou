import { expect, test } from "vitest";
import knex from "knex";
import { up } from "../../../../database/migrations/20260906120000_personal-notification-revisions.ts";
import { up as backfillPhysicalContacts } from "../../../../database/migrations/20260906121000_backfill-demandeur-personne-physique-contacts.ts";

test("migration SQL preserves existing personal reads and leaves new arrivals/follows unbackfilled", async () => {
  const queries: { sql: string; bindings: unknown[] }[] = [];
  const db = knex({ client: "pg" });
  db.client.acquireConnection = async () => ({
    query(
      config: { text: string; values?: unknown[] },
      callback: (error: null, result: object) => void,
    ) {
      queries.push({ sql: config.text, bindings: config.values ?? [] });
      callback(null, { rows: [], rowCount: 0, command: config.text.split(" ")[0].toUpperCase() });
    },
  });
  db.client.releaseConnection = async () => {};
  try {
    await up(db);
    expect(queries.some(({ sql }) => sql.includes("ALTER COLUMN updated_at DROP DEFAULT"))).toBe(
      true,
    );
    const review = queries.find(({ sql }) => sql.includes("INSERT INTO notification_review"))!;
    expect(review.sql).toContain("a.created_at <= n.viewed_at");
    expect(review.sql).toContain("n.viewed_at IS NULL AND n.viewed");
    expect(review.sql).toContain("n.dossier = a.dossier");
    expect(review.sql).toContain("a.id, n.personne");
    const actions = queries.find(({ sql }) => sql.startsWith('update "action_dossier"'))!;
    expect(actions.bindings).toEqual([true, "champ_modifie"]);
    expect(actions.sql).toContain("notification_legacy");
    expect(actions.sql).toContain("baseline");
    const files = queries.find(({ sql }) => sql.includes("piece:historique:"))!;
    expect(files.sql).toContain("n.viewed_at < a.created_at");
    expect(files.sql).toContain("earlier.created_at < a.created_at");
    expect(files.sql).toContain("earlier.type = a.type");
    expect(files.sql).toContain("a.id::text");
    expect(files.sql).toContain("baseline");
    expect(queries.some(({ sql }) => /^\s*insert into ["']?notification_arrival/i.test(sql))).toBe(
      false,
    );
    expect(
      queries.some(
        ({ sql }) => sql.startsWith('update "notification"') && sql.includes('"follow_revision"'),
      ),
    ).toBe(false);
    const recipients = queries.find(({ sql }) => sql.startsWith('update "notification"'))!;
    expect(recipients.sql).toContain("receive_legacy_changes");
    expect(recipients.bindings).toEqual([true]);
    expect(
      queries.some(({ sql }) => sql.includes('"receive_legacy_changes" boolean not null default')),
    ).toBe(true);
    queries.length = 0;
    await backfillPhysicalContacts(db);
    expect(queries).toHaveLength(1);
    expect(queries[0].sql).toContain("UPDATE identite_dossier AS i");
    expect(queries[0].sql).toContain("personne.id = dossier.demandeur_personne_physique");
    expect(queries[0].sql).toContain("i.type = 'demandeur'");
    expect(queries[0].sql).toContain("dossier.source = 'demarche_numerique'");
    expect(queries[0].sql).not.toContain("action_dossier");
  } finally {
    await db.destroy();
  }
});
