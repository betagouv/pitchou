const prettier = require("prettier");
const { markAsGenerated, defaultGetMetadata } = require("kanel");

// Strip French accents so generated TypeScript type & file names stay
// accent-free (e.g. `contrôle` table -> `Controle` type/file). Column
// properties are left untouched (getPropertyMetadata is not overridden), so
// they keep the exact accented names of the real database columns.
function deaccent(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Wrap Kanel's default metadata resolver to de-accent the emitted type name
// and output file path, without changing anything else.
function getMetadata(details, generateFor, instantiatedConfig) {
  const metadata = defaultGetMetadata(details, generateFor, instantiatedConfig);
  return {
    ...metadata,
    name: deaccent(metadata.name),
    path: deaccent(metadata.path),
  };
}

function EvenementPhaseDossier_phase_typeDossierPhase(output) {
  const EvenementPhaseDossierKey = "libs/types/src/database/public/EvenementPhaseDossier";

  const { declarations } = output[EvenementPhaseDossierKey];

  for (const { properties } of declarations) {
    for (const prop of properties) {
      if (prop.name === "phase") {
        prop.typeImports = [
          {
            name: "DossierPhase",
            path: "libs/types/src/API_Pitchou.ts",
            isAbsolute: false,
            isDefault: false,
            importAsType: true,
          },
        ];
        prop.typeName = "DossierPhase";
      }
    }

    //console.log('properties', intface.properties)
  }

  return output;
}

/**
 *
 * @param {string} outputKey
 * @param {string} propertyName
 * @param {string} typeName
 * @returns
 */
function makePreRenderHook(outputKey, propertyName, typeName) {
  return function Dossier_scientifique_type_demande(output) {
    const { declarations } = output[outputKey];

    for (const { properties } of declarations) {
      if (properties) {
        for (const prop of properties) {
          if (prop.name === propertyName) {
            prop.typeName = typeName;
          }
        }
      }
    }

    return output;
  };
}

const Dossier_scientifique_type_demande = makePreRenderHook(
  "libs/types/src/database/public/Dossier",
  "scientifique_type_demande",
  "string[]",
);
const Dossier_scientifique_mode_capture = makePreRenderHook(
  "libs/types/src/database/public/Dossier",
  "scientifique_mode_capture",
  "string[]",
);

// With `enumStyle: "type"`, Kanel emits `type X = ...;` then `export default X;`.
// That separate re-export of a type is rejected under `verbatimModuleSyntax`
// (TS1284). Rewrite it into a type-only default export.
function fixTypeOnlyDefaultExport(path, lines) {
  return lines.map((line) => {
    const match = line.match(/^export default (\w+);$/);
    const isTypeAlias = match && lines.some((l) => l.startsWith(`type ${match[1]} =`));
    return isTypeAlias ? `export type { ${match[1]} as default };` : line;
  });
}

// Kanel has no quote-style option and emits single quotes + multi-line unions.
// Format every generated file with Prettier so output matches the repo style
// (double quotes, compact unions). Calling Prettier directly bypasses
// .prettierignore, which deliberately excludes these generated dirs.
async function formatWithPrettier(path, lines) {
  const options = (await prettier.resolveConfig(path)) ?? {};
  const formatted = await prettier.format(lines.join("\n"), {
    ...options,
    parser: "typescript",
  });
  return formatted.split("\n");
}

module.exports = {
  enumStyle: "type",
  getMetadata,
  customTypeMap: {
    "pg_catalog.bytea": "Buffer",
  },

  preRenderHooks: [
    EvenementPhaseDossier_phase_typeDossierPhase,
    Dossier_scientifique_type_demande,
    Dossier_scientifique_mode_capture,
  ],

  // Providing postRenderHooks replaces Kanel's default `[markAsGenerated]`
  // (see processDatabase: `config.postRenderHooks ?? [markAsGenerated]`), so we
  // must re-add it to keep the "@generated" banner. It runs first; Prettier
  // preserves the banner when formatting afterwards.
  postRenderHooks: [markAsGenerated, fixTypeOnlyDefaultExport, formatWithPrettier],
};
