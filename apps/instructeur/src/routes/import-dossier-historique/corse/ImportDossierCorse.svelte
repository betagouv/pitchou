<script lang="ts">
  import type { DossierWithAlerts } from "../importDossierUtils.ts";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type { DossierCorseRow } from "./importDossierCorse.ts";
  import type { SchemaDemarcheSimplifiee } from "@pitchou/types/demarche-numerique/schema.ts";
  import type { DossierDemarcheNumerique88444 } from "@pitchou/types/demarche-numerique/Demarche88444.ts";

  import { extractFirstMail } from "../importDossierUtils.ts";
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import { SvelteMap } from "svelte/reactivity";
  import { text } from "d3-fetch";
  import { getODSTableRawContent, sheetRawContentToObjects, isRowNotEmpty } from "@odfjs/odfjs";
  import Pagination from "$lib/components/DSFR/Pagination.svelte";
  import {
    createDossierFromRow,
    createNomForDossier,
    rowDossierInDB,
  } from "./importDossierCorse.ts";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";

  const SUIVI_TABLE_SHEET_NAME = "Instruction";
  const INSTRUCTRICES_EMAILS_BY_INITIALS_SHEET_NAME = "Instructeur DREAL";
  const DREAL = "Corse";

  type Props = {
    dossiers?: DossierSummary[];
    schema: SchemaDemarcheSimplifiee | undefined;
  };

  let { dossiers = [], schema }: Props = $props();

  const nomsInDB = $derived(new Set(dossiers.map((d) => d.nom)));

  const nomToDossierId = $derived(new Map(dossiers.map((d) => [d.nom, d.id])));

  const nomToHistoriqueIdentifiantDemandeOnagre = $derived(
    new Map(dossiers.map((d) => [d.nom, d.historique_identifiant_demande_onagre])),
  );

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
  let importTableRows: DossierCorseRow[] = $state([]);
  let filteredImportTableRows: DossierCorseRow[] = $state([]);
  let dossiersAlreadyInDB: DossierSummary[] = $state([]);
  let rowToDossierWithAlerts: Map<DossierCorseRow, DossierWithAlerts> = new SvelteMap();
  let emailsByInitials: Map<string, string> = $state(new SvelteMap());

  let rowToLienPreremplissage: Map<any, string> = $state(new SvelteMap());

  let percentageOfDossiersCreatedInDB: number | undefined = $state();

  let showAllDossiers: boolean = $state(false);

  let loadingFichier: Promise<void[]> = $state(Promise.resolve([]));

  let numberDossiersWithAlerts: number | undefined = $derived(
    Array.from(rowToDossierWithAlerts).filter(
      (rowAndDossierWithAlerts) =>
        rowAndDossierWithAlerts[1].alertes && rowAndDossierWithAlerts[1].alertes.length >= 1,
    ).length,
  );

  let numberDossiersAlreadyImported = $derived(dossiersAlreadyInDB.length);
  let numberDossiersToImport = $derived(importTableRows.length - numberDossiersAlreadyImported);

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

        const rawDataSuiviTable = rawData.get(SUIVI_TABLE_SHEET_NAME);

        if (!rawDataSuiviTable) {
          throw new TypeError(
            `Erreur dans la récupération de la feuille ${SUIVI_TABLE_SHEET_NAME}. Assurez-vous que cette feuille existe bien dans votre tableur ods.`,
          );
        }

        const rawDataEmailsByInitials = rawData.get(INSTRUCTRICES_EMAILS_BY_INITIALS_SHEET_NAME);

        if (!rawDataEmailsByInitials) {
          throw new TypeError(
            `Erreur dans la récupération de la feuille ${INSTRUCTRICES_EMAILS_BY_INITIALS_SHEET_NAME}. Assurez-vous que cette feuille existe bien dans votre tableur ods.`,
          );
        }

        emailsByInitials = new SvelteMap(
          rawDataEmailsByInitials
            .map((row: { value: any }[]): [string, string] | null => {
              const initials = row?.[0]?.value;
              const email = extractFirstMail(row[1]?.value ?? "");
              if (row.length >= 1 && initials && email) {
                return [initials, email];
              }
              return null;
            })
            .filter((entry): entry is [string, string] => entry !== null),
        );

        const rows = [
          ...sheetRawContentToObjects(rawDataSuiviTable.filter(isRowNotEmpty)).values(),
        ];

        importTableRows = rows;

        filteredImportTableRows = rows.filter(
          (row) => !rowDossierInDB(row, nomsInDB, nomToHistoriqueIdentifiantDemandeOnagre),
        );
        dossiersAlreadyInDB = rows.filter((row) =>
          rowDossierInDB(row, nomsInDB, nomToHistoriqueIdentifiantDemandeOnagre),
        );

        const totalDossiers = rows.length;
        percentageOfDossiersCreatedInDB =
          totalDossiers > 0 ? (dossiersAlreadyInDB.length / totalDossiers) * 100 : 0;

        // Visualize at once all the alerts of all the lines when the "createDossierFromRow" function is applied to the line
        loadingFichier = Promise.all(
          importTableRows.map(async (row) => {
            const dossier = await createDossierFromRow(
              row,
              emailsByInitials,
              activitesPrincipales88444,
            );
            rowToDossierWithAlerts.set(row, dossier);
          }),
        );
      } catch (error) {
        console.error(`Une erreur est survenue pendant la lecture du fichier : ${error}`);
      }
    }
  }

  async function handleCreateLienPreRemplissage(row: DossierCorseRow) {
    const dossier = rowToDossierWithAlerts.get(row);

    if (!dossier) {
      // Should never happen
      console.warn(`La ligne n'existe pas : ${rowDossierInDB}`);
      return;
    }

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
  <title>{DREAL} — Import de dossiers — Pitchou</title>
</svelte:head>

<h1>Import de dossiers historiques {DREAL}</h1>

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
{:else}
  <h2>
    {#if showAllDossiers}
      Tous les dossiers du fichier chargé ({importTableRows.length})
    {:else}
      Dossiers restants à importer ({numberDossiersToImport} / {importTableRows.length})
    {/if}
  </h2>
  <p>Nombre de dossiers avec des alertes : {numberDossiersWithAlerts}</p>

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

    <div class="fr-progress-bar" title={`${numberDossiersToImport} / ${importTableRows.length}`}>
      <div
        style="width: {percentageOfDossiersCreatedInDB}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
      ></div>
    </div>
  </div>
  {#await loadingFichier}
    <p class="fr-mt-4w">Préparation du fichier en cours…</p>
  {:then}
    <div class="fr-table">
      <div class="fr-table__wrapper">
        <div class="fr-table__container">
          <div class="fr-table__content">
            <table class="tableau-dossier-a-creer">
              <thead>
                <tr>
                  <th> Nom du projet </th>
                  <th> Détails </th>
                  <th> Actions </th>
                </tr>
              </thead>
              <tbody>
                {#each displayedImportTableRows as displayedImportTableRow, index}
                  {@const dossierAndAlerts = rowToDossierWithAlerts.get(displayedImportTableRow)}
                  {@const dossierAlerts = dossierAndAlerts?.alertes}
                  <tr
                    data-row-key={index}
                    data-testid={dossierAlerts && dossierAlerts.length >= 1
                      ? undefined
                      : "dossier-sans-alerte(s)"}
                  >
                    <td>{createNomForDossier(displayedImportTableRow)}</td>
                    <td>
                      <ModalButton id={`dsfr-modale-${index}`}>
                        {#snippet openButton()}
                          {#if dossierAlerts && dossierAlerts.length >= 1}
                            <button
                              type="button"
                              class="fr-btn fr-btn--sm fr-btn--icon-left fr-icon-warning-line"
                              data-fr-opened="false"
                              aria-controls={`dsfr-modale-${index}`}
                            >
                              {`Voir les alertes (${dossierAlerts.length})`}
                            </button>
                          {:else}
                            <button
                              type="button"
                              class="fr-btn fr-btn--sm fr-btn--secondary"
                              data-fr-opened="false"
                              aria-controls={`dsfr-modale-${index}`}
                            >
                              {`Voir les détails`}
                            </button>
                          {/if}
                        {/snippet}
                        {#snippet content()}
                          {#if dossierAlerts && dossierAlerts.length >= 1}
                            <h3 class="fr-mb-2w">Liste des alertes&nbsp;:&nbsp;</h3>
                            <ul>
                              {#each dossierAlerts ?? [] as alert}
                                <li>
                                  <p
                                    class="fr-badge {alert.type === 'avertissement'
                                      ? 'fr-badge--warning'
                                      : 'fr-badge--error'}"
                                  >
                                    {alert.type}
                                  </p>
                                  &nbsp;:&nbsp;{alert.message}
                                </li>
                              {/each}
                            </ul>
                          {/if}
                          <ExpandCollapse open={dossierAlerts && dossierAlerts.length === 0}>
                            {#snippet summary()}
                              <h3>Données du dossier pour le pré-remplissage&nbsp;:</h3>
                            {/snippet}
                            {#snippet content()}
                              <ul>
                                {#each Object.entries(dossierAndAlerts ?? {}) as [dossierAndAlertsKey, dossierAndAlertsValue]}
                                  {#if dossierAndAlertsKey !== "alertes"}
                                    {#if dossierAndAlertsKey === "NE PAS MODIFIER - Données techniques associées à votre dossier"}
                                      {@const additionalData = Object.entries(
                                        JSON.parse(dossierAndAlertsValue as string),
                                      )}
                                      {#each additionalData as [additionalDataKey, additionalDataValue]}
                                        {#if additionalDataKey === "dossier"}
                                          {@const dossierDataFromAdditionalData = Object.entries(
                                            additionalDataValue as object,
                                          )}
                                          {#each dossierDataFromAdditionalData as dossierDataEntryFromAdditionalData}
                                            <li>
                                              <strong
                                                >{`${dossierDataEntryFromAdditionalData[0]} :`}</strong
                                              >
                                              {`${JSON.stringify(dossierDataEntryFromAdditionalData[1])}`}
                                            </li>
                                          {/each}
                                        {:else}
                                          <li>
                                            <strong>{`${additionalDataKey} :`}</strong>
                                            {`${JSON.stringify(additionalDataValue)}`}
                                          </li>
                                        {/if}
                                      {/each}
                                    {:else}
                                      <li>
                                        <strong>{`${dossierAndAlertsKey} :`}</strong>
                                        {`${JSON.stringify(dossierAndAlertsValue)}`}
                                      </li>
                                    {/if}
                                  {/if}
                                {/each}
                              </ul>
                            {/snippet}
                          </ExpandCollapse>
                        {/snippet}
                      </ModalButton>
                    </td>
                    <td>
                      {#if rowDossierInDB(displayedImportTableRow, nomsInDB, nomToHistoriqueIdentifiantDemandeOnagre)}
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
      <Pagination {pageSelectors} currentPage={pageSelectors[selectedPageNumber]}></Pagination>
    {/if}
  {:catch loadingError}
    <p class="fr-alert fr-alert--error fr-mt-4w">
      {`Une erreur est survenue lors de la préparation du fichier : ${loadingError instanceof Error ? loadingError.message : loadingError}`}
    </p>
  {/await}
{/if}

<style lang="scss">
  ul {
    list-style: none;
  }
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
