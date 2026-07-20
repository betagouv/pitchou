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
  customTypeMap: {
    "pg_catalog.bytea": "Buffer",
  },

  preRenderHooks: [
    setEvenementPhaseDossierPhaseType,
    dossierScientifiqueDemandeType,
    dossierScientifiqueCaptureMode,
  ],

  // Providing postRenderHooks replaces Kanel's default `[markAsGenerated]`
  // (see processDatabase: `config.postRenderHooks ?? [markAsGenerated]`), so we
  // must re-add it to keep the "@generated" banner. It runs first; Prettier
  // preserves the banner when formatting afterwards.
  postRenderHooks: [markAsGenerated, fixTypeOnlyDefaultExport, formatWithPrettier],
};
