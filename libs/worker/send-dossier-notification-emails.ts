import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import { dispatchDossierNotificationEmails } from "@pitchou/server/dossierNotificationEmails.ts";

try {
  const result = await dispatchDossierNotificationEmails({
    dryRun: process.argv.includes("--dry-run"),
  });
  console.log(JSON.stringify(result));
  if ("failed" in result && result.failed) process.exitCode = 1;
} finally {
  await closeDatabaseConnection();
}
