import { revisionActors, textColumns } from "./catalog.ts";
import { TransferRefusal, type Connection } from "./connection.ts";
import { batches } from "./rows.ts";

export async function transferActors(source: Connection, target: Connection, apply: boolean) {
  const ambiguous = await source.query(`select 1 from public.auth_user
    where id in (${revisionActors}) group by lower(btrim(email)) having count(*) > 1 limit 1`);
  if (ambiguous.rows.length > 0)
    throw new TransferRefusal("Source revision actors have ambiguous normalized email addresses.");
  if (apply) {
    await assertActorTriggers(target);
    await target.query(`create temporary table onagre_transfer_actor
      (source_id integer primary key, target_id integer not null, created boolean not null) on commit drop`);
  }
  const maximum = await target.query<{ id: string }>(
    "select coalesce(max(id), 0)::text as id from public.auth_user",
  );
  let nextId = BigInt(maximum.rows[0].id) + 1n;
  const summary = { matched: 0, historyOnly: 0 };
  const select = `select ${textColumns(["id", "email", "first_names", "last_name", "created_at"])}, lower(btrim(email)) as normalized_email
    from public.auth_user where id in (${revisionActors})`;
  for await (const rows of batches(source, select)) {
    for (const actor of rows) {
      const email = actor.normalized_email;
      if (!email)
        throw new TransferRefusal(
          "A source revision actor has no email. Identity cannot be verified.",
        );
      const matches = await target.query<{ id: string }>(
        "select id::text from public.auth_user where lower(btrim(email)) = $1 limit 2",
        [email],
      );
      if (matches.rows.length > 1)
        throw new TransferRefusal(
          "Target has ambiguous normalized actor emails. Resolve them before transferring.",
        );
      const existing = matches.rows[0];
      const id = existing?.id ?? String(nextId++);
      summary[existing ? "matched" : "historyOnly"]++;
      if (apply) {
        if (!existing)
          await target.query(
            `insert into public.auth_user
            (id, email, first_names, last_name, active, permissions_configured, created_at)
            values ($1, $2, $3, $4, false, true, $5)`,
            [id, email, actor.first_names, actor.last_name, actor.created_at],
          );
        await target.query("insert into pg_temp.onagre_transfer_actor values ($1, $2, $3)", [
          actor.id,
          id,
          !existing,
        ]);
      }
    }
  }
  if (apply) await assertHistoryOnly(target);
  return summary;
}

async function assertActorTriggers(target: Connection) {
  const { rows } = await target.query(`select 1 from pg_trigger t join pg_proc p on p.oid = t.tgfoid
    where t.tgrelid = 'public.auth_user'::regclass and not t.tgisinternal and t.tgenabled <> 'D'
      and (t.tgtype::int & 4) <> 0
      and not (t.tgname = 'email_notification_preferences_insert'
        and p.proname = 'initialize_email_notification_preferences'
        and p.pronamespace = 'public'::regnamespace) limit 1`);
  if (rows.length > 0)
    throw new TransferRefusal(
      "Target auth_user has an unknown INSERT trigger. History-only actor creation refused.",
    );
}

async function assertHistoryOnly(target: Connection) {
  const { rows } = await target.query(`select 1 from pg_temp.onagre_transfer_actor m
    join public.auth_user u on u.id = m.target_id where m.created and (
      u.active or not u.permissions_configured or u.first_login_at is not null or u.last_login_at is not null
      or exists (select 1 from public.auth_identity p where p.user_id = u.id)
      or exists (select 1 from public.auth_permission p where p.user_id = u.id)
      or exists (select 1 from public.auth_permission_bundle p where p.user_id = u.id)
      or exists (select 1 from public.auth_permission_exclusion p where p.user_id = u.id)
      or exists (select 1 from public.user_groupe p where p.user_id = u.id)
      or exists (select 1 from public.session p where p.user_id = u.id)) limit 1`);
  if (rows.length > 0)
    throw new TransferRefusal(
      "New historical actors unexpectedly have access or login history. Transfer rolled back.",
    );
}
