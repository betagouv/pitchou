import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

export function resumeInNewProcess() {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--input-type=module",
      "-e",
      `
  import {directDatabaseConnection as db} from "./libs/server/src/database.ts";
  import {processImportJob} from "./libs/server/src/onagre/import/jobs.ts";
  try {for(let n=0;n<10;n++) if(!await processImportJob(db)) break;} finally {await db.destroy();}
 `,
    ],
    { env: process.env, encoding: "utf8", timeout: 30000 },
  );
  assert.equal(result.status, 0, result.stderr);
}
