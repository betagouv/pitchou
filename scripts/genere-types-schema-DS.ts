import { writeFile, readFile } from "node:fs/promises";

import parseArgs from "minimist";
import { compile } from "json-schema-to-typescript";
import ky from "ky";

import type {
  SchemaDémarcheSimplifiée,
  ChampDescriptor,
  ChampDescriptorTypename,
} from "@pitchou/types/démarche-numérique/schema.ts";
import type { JSONSchema } from "json-schema-to-typescript";

const args = parseArgs(process.argv);

const ID_SCHEMA_DS = args.idSchemaDS;

if (!ID_SCHEMA_DS) {
  throw Error("L'ID du Schéma DS n'est pas défini.");
}

const urlSchema = `https://www.demarches-simplifiees.fr/preremplir/${ID_SCHEMA_DS}/schema`;

let schema: SchemaDémarcheSimplifiée;

const schemaPath = `data/démarche-numérique/schema-DS/${ID_SCHEMA_DS}.json`;

if (args.skipDownload) {
  let schemaStr: string;
  try {
    schemaStr = await readFile(schemaPath, "utf-8");
  } catch (e) {
    console.error(`Erreur lors de la récupération du fichier ${schemaPath}`);
    console.error(e);
    process.exit(1);
  }

  schema = JSON.parse(schemaStr);

  console.log(`Utilisation du fichier ${schemaPath} déjà présent dans le repo`);
} else {
  let schemaStr;

  console.info(`Téléchargement de la dernière version du schema DS ${urlSchema}`);
  try {
    schemaStr = await ky.get(urlSchema).text();
    schema = JSON.parse(schemaStr);
  } catch (err) {
    console.error(
      `Erreur lors du téléchargement de ${urlSchema}. Réessayer plus tard ou avec l'option --skipDownload`,
    );
    console.error(err);
    process.exit(1);
  }

  try {
    await writeFile(schemaPath, JSON.stringify(schema, null, 4));
  } catch (e) {
    console.error(`Erreur lors de l'écriture du fichier ${schemaPath}`, e);
  }
}

function champToStringJSONSchema({
  description,
}: Pick<ChampDescriptor, "description">): JSONSchema {
  return { type: "string", description };
}

function champToStringEnumJSONSchema({
  description,
  options,
}: Pick<ChampDescriptor, "description" | "options">): JSONSchema {
  return { type: "string", description, enum: options };
}

function champToStringArrayJSONSchema({ description, options }: ChampDescriptor): JSONSchema {
  // enum: options
  return {
    type: "array",
    description,
    items: options
      ? champToStringEnumJSONSchema({ description: "", options })
      : champToStringJSONSchema({ description: "" }),
  };
}

function champToDateJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "string", format: "date-time", tsType: "Date", description };
}

function champToBooleanJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "boolean", description };
}

function champToNumberJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "number", description };
}

function champToDépartementJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "object", tsType: "GeoAPIDépartement", description };
}

function champToCommuneJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "object", tsType: "(GeoAPICommune | string)", description };
}

function champToFileJSONSchema({ description }: ChampDescriptor): JSONSchema {
  return { type: "object", tsType: "ChampDSPieceJustificative", description };
}

function champToArrayJSONSchema({
  description,
  champDescriptors,
}: ChampDescriptor): JSONSchema | undefined {
  if (!champDescriptors) {
    throw new TypeError("missing champDescriptors");
  }

  champDescriptors = champDescriptors.filter(({ __typename }) => {
    return (
      __typename !== "HeaderSectionChampDescriptor" &&
      __typename !== "ExplicationChampDescriptor" &&
      __typename !== "CarteChampDescriptor"
    );
  });

  let items: JSONSchema;

  if (champDescriptors.length === 0) {
    return undefined;
  }

  if (champDescriptors.length === 1) {
    const { __typename } = champDescriptors[0];
    const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename);
    if (!DSChampToJSONSchema) {
      throw new TypeError(`__typename non reconnu : ${__typename}`);
    }
    // @ts-ignore
    items = DSChampToJSONSchema(champDescriptors[0]);
  } else {
    // @ts-ignore
    items = champDescriptorsToJSONSchemaObjectType(champDescriptors);
  }

  return {
    type: "array",
    description: description,
    items,
  };
}

const DSTypenameToJSONSchema = new Map<
  ChampDescriptorTypename,
  (cd: ChampDescriptor) => JSONSchema | undefined
>([
  ["DropDownListChampDescriptor", champToStringEnumJSONSchema],
  ["MultipleDropDownListChampDescriptor", champToStringArrayJSONSchema],
  ["YesNoChampDescriptor", champToBooleanJSONSchema],
  ["CheckboxChampDescriptor", champToBooleanJSONSchema],
  ["SiretChampDescriptor", champToStringJSONSchema],
  ["TextChampDescriptor", champToStringJSONSchema],
  ["AddressChampDescriptor", champToStringJSONSchema],
  ["PhoneChampDescriptor", champToStringJSONSchema],
  ["EmailChampDescriptor", champToStringJSONSchema],
  ["TextareaChampDescriptor", champToStringJSONSchema],
  ["IntegerNumberChampDescriptor", champToNumberJSONSchema],
  ["DecimalNumberChampDescriptor", champToNumberJSONSchema],
  ["DepartementChampDescriptor", champToDépartementJSONSchema],
  ["CommuneChampDescriptor", champToCommuneJSONSchema],
  ["RepetitionChampDescriptor", champToArrayJSONSchema],
  ["DateChampDescriptor", champToDateJSONSchema],
  ["PieceJustificativeChampDescriptor", champToFileJSONSchema],
]);

const {
  revision: { champDescriptors, annotationDescriptors },
} = schema;

// champDescriptors vers JSONSchema
function champDescriptorsToJSONSchemaObjectType(champDescriptors: ChampDescriptor[]) {
  const properties = Object.create(null);
  const required = [];

  for (const champDescriptor of champDescriptors) {
    const { __typename, label } = champDescriptor;

    if (
      __typename !== "HeaderSectionChampDescriptor" &&
      __typename !== "ExplicationChampDescriptor" &&
      __typename !== "CarteChampDescriptor"
    ) {
      const DSChampToJSONSchema = DSTypenameToJSONSchema.get(__typename);

      if (!DSChampToJSONSchema) {
        throw new TypeError(`__typename non reconnu : ${__typename}`);
      }

      const type = DSChampToJSONSchema(champDescriptor);

      if (type) {
        properties[label] = DSChampToJSONSchema(champDescriptor);

        // ignore champDescriptor.required
        required.push(label);
      }
    }
  }

  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

const dossierDémarcheNumériqueJSONSchema = champDescriptorsToJSONSchemaObjectType(champDescriptors);

const dossierDémarcheNumériqueInterfaceP = compile(
  //@ts-ignore
  dossierDémarcheNumériqueJSONSchema,
  `DossierDemarcheNumerique${schema.number}`,
  { bannerComment: "" },
);

/**
 * annotationDescriptors vers JSONSchema
 */

const annotationsDémarcheNumériqueJSONSchema =
  champDescriptorsToJSONSchemaObjectType(annotationDescriptors);

const annotationsDémarcheNumériqueInterfaceP = compile(
  //@ts-ignore
  annotationsDémarcheNumériqueJSONSchema,
  `AnnotationsPriveesDemarcheNumerique${schema.number}`,
  { bannerComment: "" },
);

const commentaireInitial = `/**
* Ce fichier a été généré automatiquement par outils/genere-types-schema-DS.js
* en prenant ${schemaPath} comme source
* 
* Ne pas le modifier à la main
* 
* À la place, mettre à jour ${schemaPath}
* d'après ${urlSchema}
* et relancer outils/genere-types-schema-DS.js
*/`;

const imports = [
  `import type { GeoAPICommune, GeoAPIDépartement } from "../GeoAPI.ts";`,
  `import type { ChampDSPieceJustificative } from "./apiSchema.ts";`,
].join("\n");

const outPath = `libs/types/src/démarche-numérique/Démarche${schema.number}.ts`;
await Promise.all([dossierDémarcheNumériqueInterfaceP, annotationsDémarcheNumériqueInterfaceP])
  .then(([dossierDémarcheNumériqueInterface, annotationsDémarcheNumériqueInterface]) =>
    [
      commentaireInitial,
      imports,
      dossierDémarcheNumériqueInterface,
      annotationsDémarcheNumériqueInterface,
    ].join("\n\n"),
  )
  .then((str) => writeFile(outPath, str));

console.log(`Fichier ${outPath} généré avec succès`);
