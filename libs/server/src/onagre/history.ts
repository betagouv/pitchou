import type { Knex } from "knex";
export async function loadHistory(connection: Knex) {
  const history: {
    id: number;
    mapping_key: string;
    actor_id: number;
    created_at: Date;
    after: { version: number; rule: string; target?: string };
  }[] = await connection("onagre_mapping_revision")
    .select("id", "mapping_key", "actor_id", "created_at", "after")
    .orderBy("id", "desc")
    .limit(30);
  const sharedHistory = await connection("onagre_shared_rule_revision")
    .select("id", "rule_key", "actor_id", "created_at", "after")
    .orderBy("id", "desc")
    .limit(30);
  for (const revision of sharedHistory)
    history.push({ ...revision, mapping_key: `Règle commune · ${revision.after.title}` });
  const serviceHistory = await connection("onagre_service_mapping_revision")
    .select("id", "service_id", "actor_id", "created_at", "after", "groups")
    .orderBy("id", "desc")
    .limit(30);
  for (const revision of serviceHistory)
    history.push({
      ...revision,
      mapping_key: `Service · ${revision.after.source.nomservice}`,
      after: {
        version: revision.after.version,
        target: revision.groups.map((group: { name: string }) => group.name).join(", "),
        rule: revision.after.notes || revision.after.status,
      },
    });
  history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return history.slice(0, 30);
}
