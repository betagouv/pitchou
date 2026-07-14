import parseArgs from "minimist";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import {
  supprimerEvenementsAvantTelleDate,
  supprimerEvenementsParEmail,
} from "@pitchou/server/database/evenements_metriques.ts";
import { subWeeks } from "date-fns";

const args = parseArgs(process.argv);

const email = args["email"];

let nombreSemaineAConserver = args["conserver-dernières-semaines"];

if (nombreSemaineAConserver) {
  nombreSemaineAConserver = Number(nombreSemaineAConserver);

  if (!Number.isSafeInteger(nombreSemaineAConserver)) {
    console.error(`"${args["conserver-dernières-semaines"]}" n'est pas un nombre`);
    process.exit(1);
  }

  if (nombreSemaineAConserver < 0) {
    console.error(`C'est bizarre d'avoir mis un nombre négatif en nombre de semaines à conserver`);
    process.exit(1);
  }
  if (nombreSemaineAConserver === 0) {
    console.error(`C'est bizarre d'avoir mis 0 en nombre de semaines à conserver`);
    process.exit(1);
  }
}

if (!email && !nombreSemaineAConserver) {
  console.error(`Il manque soit l'argument "--email", soit "--conserver-dernières-semaines"`);
  process.exit(1);
}
if (email && nombreSemaineAConserver) {
  console.error(
    `Il y a les deux arguments "--email" et "--conserver-dernières-semaines". Cette situation n'est pas gérée. N'en choisir qu'un seul`,
  );
  process.exit(1);
}

if (email) {
  const nombreSupprimes = await supprimerEvenementsParEmail(email);
  console.log(nombreSupprimes, `évènements supprimés concernant l'utilisateur.rice`, email);
}

if (nombreSemaineAConserver) {
  const date = subWeeks(new Date(), nombreSemaineAConserver);
  const nombreSupprimes = await supprimerEvenementsAvantTelleDate(date);
  console.log(
    nombreSupprimes,
    `évènements qui dataient d'avant le`,
    format(date, "d MMMM yyyy", { locale: fr }),
    `supprimés`,
  );
}

await closeDatabaseConnection();
