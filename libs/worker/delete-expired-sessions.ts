import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import { deleteExpiredSessions } from "@pitchou/server/session.ts";

const nombreSupprimees = await deleteExpiredSessions();
console.log(nombreSupprimees, `sessions expirées supprimées`);

await closeDatabaseConnection();
