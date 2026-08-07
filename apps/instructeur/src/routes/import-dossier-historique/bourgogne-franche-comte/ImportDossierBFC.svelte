<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { DossierBFCRow } from "./importDossierBFC.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";

  import { createDossierFromRow, createDossierName } from "./importDossierBFC.ts";
  import ImportDossierBFCResults from "./ImportDossierBFCResults.svelte";

  type Props = {
    dossiers?: DossierSummary[];
    schema: SchemaDemarcheSimplifiee | undefined;
  };

  let { dossiers = [], schema }: Props = $props();

  // Pre-computation: set of names present in the database (O(1) lookup)
  const namesInDatabase = $derived(new Set(dossiers.map((d) => d.name)));

  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.name, d.id])));

  // @ts-ignore
  const activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activité principale"]> =
    $derived(
      schema
        ? new Set(
            schema.revision.champDescriptors.find((c) => c.label === "Activité principale")
              ?.options,
          )
        : new Set(),
    );
  let importTableRows: DossierBFCRow[] = $state([]);
  let filteredImportTableRows: DossierBFCRow[] = $state([]);
  let dossiersAlreadyInDB: DossierSummary[] = $state([]);

  let rowToLienPreremplissage: Map<any, string> = $state(new SvelteMap());

  let percentageOfDossiersCreatedInDB: number | undefined = $state();

  let showAllDossiers: boolean = $state(false);

  let numberDossiersAlreadyImported = $derived(dossiersAlreadyInDB.length);
  let numberDossiersToImport = $derived(importTableRows.length - numberDossiersAlreadyImported);

  /**
   * Checks whether a specific dossier to import already exists in the database.
   * The search is performed by comparing the project name (the 'name' field of the 'dossier' table).
   */
  function isDossierRowInDatabase(row: DossierBFCRow): boolean {
    return namesInDatabase.has(createDossierName(row));
  }

  async function handleFileChange(event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement && target && target.files && target.files[0])) {
      console.error("Le champ de fichier est introuvable ou ne contient aucun fichier.");
      return;
    }
    const files: FileList | null =
      target instanceof HTMLInputElement && target && target?.files ? target?.files : null;

    const file = files && files[0];

    if (file) {
      try {
        const importFichier = await file.arrayBuffer();
        const rawData = await getODSTableRawContent(importFichier);

        const rawDataSuiviTable = rawData.get("tableau_suivi");

        if (!rawDataSuiviTable) {
          throw new TypeError(
            `Erreur dans la récupération de la page "tableau_suivi". Assurez-vous que cette page existe bien dans votre tableur ods.`,
          );
        }
        const rows = [
          ...sheetRawContentToObjects(rawDataSuiviTable.filter(isRowNotEmpty)).values(),
        ];

        importTableRows = rows;
        filteredImportTableRows = rows.filter((row) => !isDossierRowInDatabase(row));
        dossiersAlreadyInDB = rows.filter((row) => isDossierRowInDatabase(row));

        const totalDossiers = rows.length;
        percentageOfDossiersCreatedInDB =
          totalDossiers > 0 ? (dossiersAlreadyInDB.length / totalDossiers) * 100 : 0;
      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`);
      }
    }
  }

  async function handleCreateLienPreRemplissage(row: DossierBFCRow) {
    const dossier = await createDossierFromRow(row, activitesPrincipales88444);

    console.log(
      { dossier },
      dossier["NE PAS MODIFIER - Données techniques associées à votre dossier"],
      "après avoir cliqué sur Préparer préremplissage",
    );
    try {
      const link = await text("/lien-preremplissage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(dossier),
      });

      rowToLienPreremplissage.set(row, link);
      rowToLienPreremplissage = rowToLienPreremplissage;
    } catch (error) {
      throw new Error(
        `Une erreur est survenue lors de la récupération du lien de préremplissage : ${error}`,
      );
    }
  }

  // Pagination of the tracking table
  type PageSelector = () => void;

  const DOSSIERS_PER_PAGE = 20;

  // page number matching the one displayed, therefore starting at 1
  let selectedPageNumber: number = $state(1);

  let pageSelectors: [undefined, ...rest: PageSelector[]] | undefined = $derived.by(() => {
    if (importTableRows.length >= DOSSIERS_PER_PAGE * 2 + 1) {
      const pageCount = Math.ceil(importTableRows.length / DOSSIERS_PER_PAGE);

      return [
        undefined,
        ...[...Array(pageCount).keys()].map((i) => () => {
          //console.log('sélection de la page', i+1)
          selectedPageNumber = i + 1;
        }),
      ];
    }

    return undefined;
  });

  $effect(() => {
    if (pageSelectors) selectedPageNumber = 1;
  });

  let displayedImportTableRows: typeof importTableRows = $derived.by(() => {
    const rowsToDisplay = showAllDossiers ? importTableRows : filteredImportTableRows;

    if (!pageSelectors) return rowsToDisplay;
    else {
      return rowsToDisplay.slice(
        DOSSIERS_PER_PAGE * (selectedPageNumber - 1),
        DOSSIERS_PER_PAGE * selectedPageNumber,
      );
    }
  });
</script>

<svelte:head>
  <title>Bourgogne-Franche-Comté — Import de dossiers — Pitchou</title>
</svelte:head>

<h1>Import de dossiers historiques Bourgogne-Franche-Comté</h1>

{#if !importTableRows || importTableRows.length === 0}
  <div class="fr-upload-group fr-mb-4w">
    <label class="fr-label" for="file-upload">
      Charger un fichier de suivi
      <span class="fr-hint-text">Formats supportés : .ods</span>
    </label>
    <input
      class="fr-upload"
      aria-describedby="file-upload-messages"
      type="file"
      id="file-upload"
      name="file-upload"
      accept=".ods"
      onchange={handleFileChange}
    />
    <div class="fr-messages-group" id="file-upload-messages" aria-live="polite"></div>
  </div>
{/if}

{#if importTableRows.length >= 1}
  <ImportDossierBFCResults
    allRows={importTableRows}
    rows={displayedImportTableRows}
    bind:showAll={showAllDossiers}
    remaining={numberDossiersToImport}
    percentage={percentageOfDossiersCreatedInDB}
    dossierIds={nomToDossierId}
    links={rowToLienPreremplissage}
    isImported={isDossierRowInDatabase}
    prepare={handleCreateLienPreRemplissage}
    {pageSelectors}
    selectedPage={selectedPageNumber}
  />
{/if}
