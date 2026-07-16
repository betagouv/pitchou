<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { DossierBFCRow } from "./importDossierBFC.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";

  import Pagination from "$lib/components/DSFR/Pagination.svelte";

  import { createDossierFromRow, createNomForDossier } from "./importDossierBFC.ts";
  import BoutonModale from "$lib/components/DSFR/BoutonModale.svelte";

  type Props = {
    dossiers?: DossierSummary[];
    schema: SchemaDemarcheSimplifiee | undefined;
  };

  let { dossiers = [], schema }: Props = $props();

  // Pre-computation: set of names present in the database (O(1) lookup)
  const nomsInDB = $derived(new Set(dossiers.map((d) => d.nom)));

  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.nom, d.id])));

  // @ts-ignore
  const activitesPrincipales88444: Set<DossierDemarcheNumerique88444["Activite principale"]> =
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
   * The search is performed by comparing the project name (the 'nom' field of the 'dossier' table).
   */
  function rowDossierInDB(row: DossierBFCRow): boolean {
    return nomsInDB.has(createNomForDossier(row));
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
        filteredImportTableRows = rows.filter((row) => !rowDossierInDB(row));
        dossiersAlreadyInDB = rows.filter((row) => rowDossierInDB(row));

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

  let pageSelectors: [undefined, ...rest: PageSelector[]] | undefined = $derived.by(
    () => {
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
    },
  );

  $effect(() => {
    if (pageSelectors) selectedPageNumber = 1;
  });

  let displayedImportTableRows: typeof importTableRows = $derived.by(() => {
    const rowsToDisplay = showAllDossiers
      ? importTableRows
      : filteredImportTableRows;

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
  <h2>
    {#if showAllDossiers}
      Tous les dossiers du fichier chargé ({importTableRows.length})
    {:else}
      Dossiers restants à importer ({numberDossiersToImport} / {importTableRows.length})
    {/if}
  </h2>

  <div class="fr-toggle">
    <input
      type="checkbox"
      class="fr-toggle__input"
      id="toggle"
      aria-describedby="toggle-messages"
      bind:checked={showAllDossiers}
    />
    <label
      class="fr-toggle__label"
      for="toggle"
      data-fr-checked-label="Activé"
      data-fr-unchecked-label="Désactivé"
    >
      Afficher tous les dossiers
    </label>
    <div class="fr-messages-group" id="toggle-messages" aria-live="polite"></div>
  </div>

  <div class="progression">
    <div>{numberDossiersToImport} / {importTableRows.length}</div>

    <div
      class="fr-progress-bar"
      title={`${numberDossiersToImport} / ${importTableRows.length}`}
    >
      <div
        style="width: {percentageOfDossiersCreatedInDB}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
      ></div>
    </div>
  </div>

  <div class="fr-table">
    <div class="fr-table__wrapper">
      <div class="fr-table__container">
        <div class="fr-table__content">
          <table class="tableau-dossier-a-creer">
            <thead>
              <tr>
                <th> Nom du projet (OBJET) </th>
                <th> Détails </th>
                <th> Actions </th>
              </tr>
            </thead>
            <tbody>
              {#each displayedImportTableRows as displayedImportTableRow, index}
                <tr data-row-key="1">
                  <td>{createNomForDossier(displayedImportTableRow)}</td>
                  <td>
                    <BoutonModale id={`dsfr-modale-${index}`}>
                      {#snippet boutonOuvrir()}
                        <button type="button">Voir les détails</button>
                      {/snippet}
                      {#snippet contenu()}
                        <div>{JSON.stringify(displayedImportTableRow)}</div>
                      {/snippet}
                    </BoutonModale>
                  </td>
                  <td>
                    {#if rowDossierInDB(displayedImportTableRow)}
                      <p class="fr-badge fr-badge--success">En base de données</p>
                      <a
                        href={`/dossier/${nomToDossierId.get(createNomForDossier(displayedImportTableRow))}`}
                        target="_blank"
                        class="fr-btn fr-btn--secondary fr-ml-2w"
                      >
                        Ouvrir dossier
                      </a>
                    {:else if rowToLienPreremplissage.get(displayedImportTableRow)}
                      <a
                        href={rowToLienPreremplissage.get(displayedImportTableRow)}
                        target="_blank"
                        class="fr-btn">Créer dossier</a
                      >
                    {:else}
                      <button
                        type="button"
                        class="fr-btn fr-btn--secondary"
                        onclick={() => handleCreateLienPreRemplissage(displayedImportTableRow)}
                        >Préparer préremplissage</button
                      >
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  {#if pageSelectors}
    <Pagination pageSelectors={pageSelectors} currentPage={pageSelectors[selectedPageNumber]}
    ></Pagination>
  {/if}
{/if}

<style lang="scss">
  h2 {
    margin-bottom: 1rem;
  }

  .fr-toggle label::before {
    max-width: 5rem;
  }

  .progression {
    display: flex;
    flex-direction: row;
    align-items: center;

    .fr-progress-bar {
      flex: 1;

      height: 1.5rem;
      margin-left: 1rem;
      border-radius: 8px;
      overflow: hidden;

      background: var(--background-alt-grey);
    }
  }

  .tableau-dossier-a-creer {
    th,
    td:not(:last-of-type) {
      max-height: 2rem;
      overflow: auto;
    }
  }
</style>
