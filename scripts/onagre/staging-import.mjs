import { readBundle } from "./staging-import/bundle.mjs";
import { connect } from "./staging-import/target.mjs";
import { storage } from "./staging-import/storage.mjs";
import { run } from "./staging-import/run.mjs";
import { readAttachmentManifest } from "./local-import/attachments.mjs";

const args = process.argv.slice(2);
const apply = args[0] === "--apply";
if (apply) args.shift();
const [path, sha256, reviewerEmail, limit] = args;
if (
  args.length < 3 ||
  args.length > 4 ||
  !reviewerEmail.includes("@") ||
  (limit !== undefined && (apply || !/^[1-9]\d*$/u.test(limit)))
)
  throw new Error(
    "Usage: staging-import.mjs [--apply] bundle.json.gz SHA256 reviewer@email [dry-run-project-limit]",
  );
const bundle = await readBundle(path, sha256);
const attachments = await readAttachmentManifest(process.env.ONAGRE_ATTACHMENT_MANIFEST);
const client = await connect(process.env);
const objects = storage(process.env);
try {
  await run({
    client,
    objects,
    bundle,
    sha256,
    reviewerEmail,
    apply,
    attachments,
    limit: Number(limit) || undefined,
  });
} finally {
  await client.end();
  objects.close();
}
