import type { Knex } from "knex";

/** Internal SQL expressions only; callers bind all user input. */
export function sharedDossierIdsSql(dossier: string) {
  return `SELECT ${dossier} AS dossier UNION
    SELECT sibling.dossier FROM dossier_demande member
    JOIN dossier_demande sibling ON sibling.projet = member.projet WHERE member.dossier = ${dossier}`;
}

export async function sharedDossierIds(db: Knex, dossierIds: number[]): Promise<number[]> {
  if (dossierIds.length === 0) return [];
  const { rows } = await db.raw(
    `SELECT unnest(?::integer[]) as dossier UNION
    SELECT sibling.dossier FROM dossier_demande member JOIN dossier_demande sibling ON sibling.projet = member.projet
    WHERE member.dossier = ANY(?::integer[])`,
    [dossierIds, dossierIds],
  );
  return rows.map((row: { dossier: number }) => row.dossier);
}
