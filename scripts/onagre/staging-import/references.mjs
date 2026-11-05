const tables = new Map([
  ["espece_taxref", "cd_nom"],
  ["espece_protegee_reference", "cd_ref"],
  ["espece_protegee_modification", "cd_ref"],
]);

// Only missing reference rows are inserted; existing staging reference choices remain authoritative.
export async function restoreReferences(client, references) {
  const counts = {};
  for (const { table, values } of references) {
    const key = tables.get(table);
    if (!key || !values[key] || Object.keys(values).some((name) => !/^[a-z_]+$/u.test(name)))
      throw new Error("Invalid reference row");
    if (await client.trx(table).where(key, values[key]).first()) continue;
    const row = { ...values };
    delete row.id;
    delete row.modified_by;
    await client.trx(table).insert(row);
    counts[table] = (counts[table] ?? 0) + 1;
  }
  return counts;
}
