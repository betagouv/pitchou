import { readBundle } from "./staging-import/bundle.mjs";
import { connect } from "./staging-import/target.mjs";
import { storage } from "./staging-import/storage.mjs";
import { run } from "./staging-import/run.mjs";
import { readAttachmentManifest } from "./local-import/attachments.mjs";
import { parseArguments } from "./staging-import/args.mjs";

const { apply, path, sha256, reviewerEmail, limit } = parseArguments(process.argv.slice(2));
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
    limit,
  });
} finally {
  await client.end();
  objects.close();
}
