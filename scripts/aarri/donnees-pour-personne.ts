import parseArgs from "minimist";
import { getEvenementsForPersonne } from "@pitchou/server/database/aarri/utils.ts";
import { createOdsFile } from "@odfjs/odfjs";
import { formatDateAbsolute } from "@pitchou/common/formatDate.ts";
import { closeDatabaseConnection } from "@pitchou/server/database.ts";

const args = parseArgs(process.argv);

// @ts-ignore
if (args.origin) origin = args.origin;

if (!args.email) {
  console.error(`Il manque le paramètre --email`);
  process.exit(1);
}

const email = args.email;

console.log(`Mail de la personne concernée : ${email}`);
console.log(`Début des Calculs des données AARRI.`);

const evenements = await getEvenementsForPersonne(email);
const evenementsCount = Map.groupBy(evenements, ({ evenement }) => evenement);

console.log(`✅ Résultats :`);
console.log(
  "Cette personne a enregistré",
  evenements.length,
  "évènements depuis le",
  `${formatDateAbsolute(evenements.at(-1)?.date)}`,
);

// Creation of the ODS file to store the results
const evenementsFormattesPourODS = evenements.map(({ date, evenement, details }) => [
  {
    value: formatDateAbsolute(date, "dd/MM/yyyy"),
    type: "string",
  },
  {
    value: evenement,
    type: "string",
  },
  {
    value: details ? JSON.stringify(details) : " ",
    type: "string",
  },
]);

const headerEvenements = [
  [
    {
      value: "Date de l'évènement",
      type: "string",
    },
    {
      value: "Évènement",
      type: "string",
    },
    {
      value: "Détails concernant l'évènement",
      type: "string",
    },
  ],
];
const evenementCountsFormattesPourODS = [...evenementsCount].map(([nomEvenement, evenements]) => [
  {
    value: nomEvenement,
    type: "string",
  },
  {
    value: evenements.length,
    type: "number",
  },
]);

const headerEvenementsCount = [
  [
    {
      value: "Évènement",
      type: "string",
    },
    {
      value: "Nombre de fois que l'évènement a été enregistré",
      type: "string",
    },
  ],
];

const aujourdhui = new Date();

const content = new Map([
  [
    "Informations",
    [
      [
        {
          value: `Les données ont été calculées le ${formatDateAbsolute(aujourdhui)}`,
          type: "string",
        },
      ],
      [
        {
          value: `Mail de la personne concernée : ${email}`,
          type: "string",
        },
      ],
    ],
  ],
  ["Évènements", [...headerEvenements, ...evenementsFormattesPourODS]],
  ["Évènements avec count", [...headerEvenementsCount, ...evenementCountsFormattesPourODS]],
]);

const ods: ArrayBuffer = await createOdsFile(content as Parameters<typeof createOdsFile>[0]);

console.log("ods", ods);

closeDatabaseConnection();
