import { readFile, writeFile } from "node:fs/promises";

import type {
  ChampDescriptor,
  ChampDescriptorTypename,
  SchemaDemarcheSimplifiee,
} from "@pitchou/types/demarche-numerique/schema.ts";
import { compile, type JSONSchema } from "json-schema-to-typescript";
import ky from "ky";
import parseArgs from "minimist";

const args = parseArgs(process.argv);
const schemaId = args.idSchemaDS;
if (!schemaId) throw Error("L'ID du Schéma DS n'est pas défini.");

const schemaUrl = `https://www.demarches-simplifiees.fr/preremplir/${schemaId}/schema`;
const schemaPath = `data/demarche-numerique/schema-DS/${schemaId}.json`;

async function loadSchema(): Promise<SchemaDemarcheSimplifiee> {
  if (args.skipDownload) {
    try {
      const schema = JSON.parse(await readFile(schemaPath, "utf-8"));
      console.log(`Utilisation du fichier ${schemaPath} déjà présent dans le repo`);
      return schema;
    } catch (error) {
      console.error(`Erreur lors de la récupération du fichier ${schemaPath}`);
      console.error(error);
      process.exit(1);
    }
  }

  console.info(`Téléchargement de la dernière version du schema DS ${schemaUrl}`);
  let schema: SchemaDemarcheSimplifiee;
  try {
    schema = JSON.parse(await ky.get(schemaUrl).text());
  } catch (error) {
    console.error(
      `Erreur lors du téléchargement de ${schemaUrl}. Réessayer plus tard ou avec l'option --skipDownload`,
    );
    console.error(error);
    process.exit(1);
  }

  try {
    await writeFile(schemaPath, JSON.stringify(schema, null, 4));
  } catch (error) {
    console.error(`Erreur lors de l'écriture du fichier ${schemaPath}`, error);
  }
  return schema;
}

const stringSchema = ({ description }: ChampDescriptor): JSONSchema => ({
  type: "string",
  description,
});
const enumSchema = ({ description, options }: ChampDescriptor): JSONSchema => ({
  type: "string",
  description,
  enum: options,
});
const stringArraySchema = ({ description, options }: ChampDescriptor): JSONSchema => ({
  type: "array",
  description,
  items: options
    ? enumSchema({ description: "", options } as ChampDescriptor)
    : stringSchema({ description: "" } as ChampDescriptor),
});
const dateSchema = ({ description }: ChampDescriptor): JSONSchema => ({
  type: "string",
  format: "date-time",
  tsType: "Date",
  description,
});
const describedSchema =
  (type: JSONSchema["type"], tsType?: string) =>
  ({ description }: ChampDescriptor): JSONSchema => ({ type, tsType, description });

function repetitionSchema({
  description,
  champDescriptors,
}: ChampDescriptor): JSONSchema | undefined {
  if (!champDescriptors) throw new TypeError("missing champDescriptors");
  const descriptors = champDescriptors.filter(
    ({ __typename }) => !ignoredDescriptorTypes.has(__typename),
  );
  if (descriptors.length === 0) return undefined;

  let items: JSONSchema;
  if (descriptors.length === 1) {
    const converter = descriptorConverters.get(descriptors[0].__typename);
    if (!converter) throw new TypeError(`__typename non reconnu : ${descriptors[0].__typename}`);
    items = converter(descriptors[0])!;
  } else {
    items = descriptorsToObjectSchema(descriptors);
  }
  return { type: "array", description, items };
}

const ignoredDescriptorTypes = new Set<ChampDescriptorTypename>([
  "HeaderSectionChampDescriptor",
  "ExplicationChampDescriptor",
  "CarteChampDescriptor",
]);
const descriptorConverters = new Map<
  ChampDescriptorTypename,
  (descriptor: ChampDescriptor) => JSONSchema | undefined
>([
  ["DropDownListChampDescriptor", enumSchema],
  ["MultipleDropDownListChampDescriptor", stringArraySchema],
  ["YesNoChampDescriptor", describedSchema("boolean")],
  ["CheckboxChampDescriptor", describedSchema("boolean")],
  ["SiretChampDescriptor", stringSchema],
  ["TextChampDescriptor", stringSchema],
  ["AddressChampDescriptor", stringSchema],
  ["PhoneChampDescriptor", stringSchema],
  ["EmailChampDescriptor", stringSchema],
  ["TextareaChampDescriptor", stringSchema],
  ["IntegerNumberChampDescriptor", describedSchema("number")],
  ["DecimalNumberChampDescriptor", describedSchema("number")],
  ["DepartementChampDescriptor", describedSchema("object", "GeoAPIDepartement")],
  ["CommuneChampDescriptor", describedSchema("object", "(GeoAPICommune | string)")],
  ["RepetitionChampDescriptor", repetitionSchema],
  ["DateChampDescriptor", dateSchema],
  ["PieceJustificativeChampDescriptor", describedSchema("object", "ChampDSPieceJustificative")],
]);

function descriptorsToObjectSchema(descriptors: ChampDescriptor[]): JSONSchema {
  const properties = Object.create(null) as Record<string, JSONSchema>;
  const required: string[] = [];
  for (const descriptor of descriptors) {
    if (ignoredDescriptorTypes.has(descriptor.__typename)) continue;
    const converter = descriptorConverters.get(descriptor.__typename);
    if (!converter) throw new TypeError(`__typename non reconnu : ${descriptor.__typename}`);
    const property = converter(descriptor);
    if (property) {
      properties[descriptor.label] = property;
      required.push(descriptor.label);
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

const schema = await loadSchema();
const compileOptions = { bannerComment: "" };
const [dossierInterface, annotationsInterface] = await Promise.all([
  compile(
    descriptorsToObjectSchema(schema.revision.champDescriptors),
    `DossierDemarcheNumerique${schema.number}`,
    compileOptions,
  ),
  compile(
    descriptorsToObjectSchema(schema.revision.annotationDescriptors),
    `AnnotationsPriveesDemarcheNumerique${schema.number}`,
    compileOptions,
  ),
]);

const generatedComment = `/**
* Ce fichier a été généré automatiquement par outils/genere-types-schema-DS.js
* en prenant ${schemaPath} comme source
*
* Ne pas le modifier à la main
*
* À la place, mettre à jour ${schemaPath}
* d'après ${schemaUrl}
* et relancer outils/genere-types-schema-DS.js
*/`;
const imports = [
  `import type { GeoAPICommune, GeoAPIDepartement } from "../GeoAPI.ts";`,
  `import type { ChampDSPieceJustificative } from "./apiSchema.ts";`,
].join("\n");
const outputPath = `libs/types/src/demarche-numerique/Demarche${schema.number}.ts`;
await writeFile(
  outputPath,
  [generatedComment, imports, dossierInterface, annotationsInterface].join("\n\n"),
);
console.log(`Fichier ${outputPath} généré avec succès`);
