import parseArgs from "minimist";
import { resetSecretGeoMCE, getSecretGeoMCE } from "@pitchou/server/database/capability-geomce.ts";
import { closeDatabaseConnection } from "@pitchou/server/database.ts";

const args = parseArgs(process.argv);

const getCap = args["capability-url"];
const resetCap = args["reset-capability-url"];

if (!getCap && !resetCap) {
  console.error(`Utiliser l'argument --capability-url ou --reset-capability-url`);
}
if (getCap && resetCap) {
  console.error(
    `Utiliser soit --capability-url soit --reset-capability-url, mais pas les deux en même temps !`,
  );
}

let origin = "https://pitchou.beta.gouv.fr";

if (args.dev) origin = "http://localhost:2648";

if (args.origin) origin = args.origin;

const baseURL = `${origin}/declaration-geomce?secret=`;

if (getCap) {
  const secret = await getSecretGeoMCE();
  const capURLGeoMCE = `${baseURL}${secret}`;

  console.log(`Lien d'API GeoMCE:`, capURLGeoMCE);
}

if (resetCap) {
  console.log("Reset de la capability GeoMCE");
  const secret = await resetSecretGeoMCE();
  const capURLGeoMCE = `${baseURL}${secret}`;

  console.log(`Lien d'API GeoMCE:`, capURLGeoMCE);
}

await closeDatabaseConnection();
