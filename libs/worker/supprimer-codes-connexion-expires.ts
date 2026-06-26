import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import { deleteExpiredLoginCodes } from "@pitchou/server/login-code.ts";

const nombreSupprimes = await deleteExpiredLoginCodes();
console.log(nombreSupprimes, `codes de connexion expirés supprimés`);

await closeDatabaseConnection();
