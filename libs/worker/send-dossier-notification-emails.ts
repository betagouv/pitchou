import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";

try {
  // Both apps deploy the root cron.json; only instructeur owns this queue worker.
  if (process.env.PITCHOU_APP === "admin") {
    console.log(JSON.stringify({ skipped: "admin" }));
  } else {
    const result = await dispatchDossierNotificationEmails({
      dryRun: process.argv.includes("--dry-run"),
    });
    console.log(JSON.stringify(result));
    if ("failed" in result && result.failed) process.exitCode = 1;
  }
} finally {
  await closeDatabaseConnection();
}
