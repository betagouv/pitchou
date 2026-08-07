const prettier = require("prettier");
const { markAsGenerated } = require("kanel");

function setEvenementPhaseDossierPhaseType(output) {
  const evenementPhaseDossierKey = "libs/types/src/database/public/EvenementPhaseDossier";

  const { declarations } = output[evenementPhaseDossierKey];

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
  }

  return output;
}

function setDossierSourceType(output) {
  const { declarations } = output["libs/types/src/database/public/Dossier"];

  for (const { properties } of declarations) {
    if (!properties) continue;
    for (const prop of properties) {
      if (prop.name === "source") {
        prop.typeImports = [
          {
            name: "DossierSource",
            path: "libs/types/src/dossierSource.ts",
            isAbsolute: false,
            isDefault: false,
            importAsType: true,
          },
        ];
        prop.typeName = "DossierSource";
      }
    }
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
  return function setPropertyType(output) {
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

const dossierScientifiqueDemandeType = makePreRenderHook(
  "libs/types/src/database/public/Dossier",
  "scientifique_demande_type",
  "string[]",
);
const dossierScientifiqueCaptureMode = makePreRenderHook(
  "libs/types/src/database/public/Dossier",
  "scientifique_capture_mode",
  "string[]",
);
const dossierEolienMortalityActions = makePreRenderHook(
  "libs/types/src/database/public/Dossier",
  "eolien_mortality_actions",
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
  // Kanel 4 dropped the -d/-o CLI flags; connection and output live here now.
  connection: process.env.DATABASE_URL,
  outputPath: "./libs/types/src/database",
  enumStyle: "type",
  customTypeMap: {
    "pg_catalog.bytea": "Buffer",
  },

  preRenderHooks: [
    setEvenementPhaseDossierPhaseType,
    setDossierSourceType,
    dossierScientifiqueDemandeType,
    dossierScientifiqueCaptureMode,
    dossierEolienMortalityActions,
  ],

  // Providing postRenderHooks replaces Kanel's default `[markAsGenerated]`
  // (see processDatabase: `config.postRenderHooks ?? [markAsGenerated]`), so we
  // must re-add it to keep the "@generated" banner. It runs first; Prettier
  // preserves the banner when formatting afterwards.
  postRenderHooks: [markAsGenerated, fixTypeOnlyDefaultExport, formatWithPrettier],
};
