const usage =
  "Usage: staging-import.mjs [--apply] bundle.json.gz SHA256 [reviewer@email] [dry-run-project-limit]";

/**
 * Parses the command line. The reviewer is optional: without it, existing access is left
 * unchanged and group routing alone assigns the imported dossiers.
 */
export function parseArguments(argv) {
  const args = [...argv];
  const apply = args[0] === "--apply";
  if (apply) args.shift();
  const [path, sha256, ...rest] = args;
  const reviewerEmail = rest[0]?.includes("@") ? rest.shift() : undefined;
  const [limit, ...extra] = rest;
  if (
    !path ||
    !sha256 ||
    extra.length > 0 ||
    (limit !== undefined && (apply || !/^[1-9]\d*$/u.test(limit)))
  )
    throw new Error(usage);
  return { apply, path, sha256, reviewerEmail, limit: Number(limit) || undefined };
}
