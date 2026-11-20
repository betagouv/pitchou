import type { Knex } from "knex";

type ImportedDemande = {
  source_key: string;
  project_key: string;
  source_hash: string;
  dossier_id: number;
};

export async function loadImportedDuplicateDemandes(db: Knex, keys: string[]) {
  const imported = new Map<string, ImportedDemande>();
  if (
    keys.length === 0 ||
    !(await db.schema.withSchema("onagre_local_import").hasTable("reconciled_demande"))
  )
    return imported;
  const { rows } = await db.raw<{ rows: ImportedDemande[] }>(
    `SELECT DISTINCT i.source_key, r.project_key, r.source_hash, d.id AS dossier_id
      FROM onagre_local_import.identity i
      JOIN dossier d ON d.id::text = i.target_id
      JOIN dossier_demande member ON member.dossier = d.id
      JOIN onagre_local_import.reconciled_demande r ON r.project_id = member.projet
      WHERE i.table_name = 'dossier' AND d.source = 'onagre'
        AND i.source_key = i.dossier_key AND i.source_key = ANY(?::text[])`,
    [keys],
  );
  for (const row of rows)
    imported.set(importKey(row.project_key, row.source_hash, row.source_key), row);
  return imported;
}

export function importedDuplicateDossier(
  imported: Map<string, ImportedDemande>,
  projectId: string,
  sourceHash: string,
  key: string,
): number | undefined {
  return imported.get(importKey(`onagre-national:projet:${projectId}`, sourceHash, key))
    ?.dossier_id;
}

function importKey(projectKey: string, sourceHash: string, demandeKey: string) {
  return `${projectKey}/${sourceHash}/${demandeKey}`;
}
