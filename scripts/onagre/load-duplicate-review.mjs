// Load review evidence locally; never create dossiers or make team decisions.
import fs from "node:fs/promises";
import { connect } from "./local-import/connection.mjs";
import { stageDuplicateBundle } from "../../libs/server/src/onagre/duplicates/bundle.ts";
import { stageConfirmedDuplicates } from "../../libs/server/src/onagre/confirmedDuplicates.ts";

const args = process.argv.slice(2);
if (args.length !== 1)
  throw new Error(
    "Usage: node --env-file=.env --import tsx scripts/onagre/load-duplicate-review.mjs <bundle.json>",
  );
const bundle = JSON.parse(await fs.readFile(args[0], "utf8"));
const client = await connect(process.env);
try {
  await client.begin();
  const result =
    bundle.format === "pitchou-onagre-confirmed-duplicates-v1"
      ? await stageConfirmedDuplicates(client.trx, bundle)
      : await stageDuplicateBundle(client.trx, bundle);
  await client.finish(true);
  console.log(JSON.stringify(result));
} finally {
  await client.end();
}
