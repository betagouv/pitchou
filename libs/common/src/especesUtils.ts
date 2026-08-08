/// <reference path="./odfjs.d.ts" />
export {
  TAXREF_ROWClassification,
  dbRowToEspeceProtegee,
  especeLabel,
  especeProtegeeStringToEspeceProtegee,
  isClassif,
  nomsVernaculaires,
} from "./especes/classification.ts";
export { descriptionMenacesEspecesToOdsArrayBuffer } from "./especes/exportSpreadsheet.ts";
export { importDescriptionMenacesEspecesFromURL } from "./especes/importUrl.ts";
export {
  assertSpeciesSpreadsheet,
  importDescriptionMenacesEspecesFromOdsArrayBuffer,
} from "./especes/importSpreadsheet.ts";
export { actMetTransArraysToMapBundle } from "./especes/referentiel.ts";
