import parseArgs from "minimist";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { closeDatabaseConnection } from "@pitchou/server/database.ts";
import {
  deleteEvenementsBeforeDate,
  deleteEvenementsByEmail,
} from "@pitchou/server/database/evenements_metriques.ts";
import { subWeeks } from "date-fns";

const args = parseArgs(process.argv);

const email = args["email"];

let numberWeeksToKeep = args["conserver-dernières-semaines"];

if (numberWeeksToKeep) {
  numberWeeksToKeep = Number(numberWeeksToKeep);

  if (!Number.isSafeInteger(numberWeeksToKeep)) {
    console.error(`"${args["conserver-dernières-semaines"]}" n'est pas un nombre`);
    process.exit(1);
  }

  if (numberWeeksToKeep < 0) {
    console.error(`C'est bizarre d'avoir mis un nombre négatif en nombre de semaines à conserver`);
    process.exit(1);
  }
  if (numberWeeksToKeep === 0) {
    console.error(`C'est bizarre d'avoir mis 0 en nombre de semaines à conserver`);
    process.exit(1);
  }
}

if (!email && !numberWeeksToKeep) {
  console.error(`Il manque soit l'argument "--email", soit "--conserver-dernières-semaines"`);
  process.exit(1);
}
if (email && numberWeeksToKeep) {
  console.error(
    `Il y a les deux arguments "--email" et "--conserver-dernières-semaines". Cette situation n'est pas gérée. N'en choisir qu'un seul`,
  );
  process.exit(1);
}

if (email) {
  const numberDeleted = await deleteEvenementsByEmail(email);
  console.log(numberDeleted, `évènements supprimés concernant l'utilisateur.rice`, email);
}

if (numberWeeksToKeep) {
  const date = subWeeks(new Date(), numberWeeksToKeep);
  const numberDeleted = await deleteEvenementsBeforeDate(date);
  console.log(
    numberDeleted,
    `évènements qui dataient d'avant le`,
    format(date, "d MMMM yyyy", { locale: fr }),
    `supprimés`,
  );
}

await closeDatabaseConnection();
