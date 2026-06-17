import { rebuildEspeceProtegeeReference } from "@pitchou/server/especeProtegeeReference.ts";
import { closeDatabaseConnection } from "@pitchou/server/database.ts";

// Rebuilds the `espece_protegee_reference` table from the already-imported
// `espece_taxref` + `espece_bdc_statut` tables. The manual layer
// (`espece_protegee_modification`) is never touched.

process.title = `Reconstruction référence espèces`;

rebuildEspeceProtegeeReference()
  .then(() => console.info("espece_protegee_reference rebuilt"))
  .finally(() => closeDatabaseConnection());
