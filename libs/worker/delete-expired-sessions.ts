import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import { deleteExpiredSessions } from "@pitchou/server/session.ts";

const deletedCount = await deleteExpiredSessions();
console.log(deletedCount, `sessions expirées supprimées`);

await closeDatabaseConnection();
