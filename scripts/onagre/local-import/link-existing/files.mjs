/** File names are review evidence only; this does not read document contents. */
export async function reviewedFileMetadata(client, current, evidence) {
  const ids = [
    ...new Set(
      JSON.stringify([current, evidence]).match(
        /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/giu,
      ) ?? [],
    ),
  ];
  if (ids.length === 0) return [];
  await client.query("LOCK TABLE public.file IN SHARE MODE");
  return (
    await client.query(
      "SELECT to_jsonb(f) AS row FROM public.file f WHERE id=ANY($1::uuid[]) ORDER BY id",
      [ids],
    )
  ).rows.map((r) => r.row);
}
