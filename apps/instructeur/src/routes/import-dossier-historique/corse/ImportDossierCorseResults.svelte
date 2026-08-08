<script lang="ts">
  import ExpandCollapse from "$lib/components/common/ExpandCollapse.svelte";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import { createDossierName, isDossierRowInDatabase } from "./importDossierCorse.ts";
  import type { DossierCorseRow } from "./DossierCorseRow.ts";
  import type { DossierWithAlerts } from "../importDossierUtils.ts";
  type Props = {
    allRows: DossierCorseRow[];
    rows: DossierCorseRow[];
    showAll: boolean;
    remaining: number;
    alertCount?: number;
    percentage?: number;
    loading: Promise<void[]>;
    dossiers: Map<DossierCorseRow, DossierWithAlerts>;
    links: Map<any, string>;
    names: Set<string | null>;
    onagre: Map<string | null, string | null>;
    dossierIds: Map<string | null, number>;
    prepare: (row: DossierCorseRow) => void;
    pageSelectors?: [undefined, ...(() => void)[]];
    selectedPage: number;
  };
  let {
    allRows,
    rows,
    showAll = $bindable(),
    remaining,
    alertCount,
    percentage,
    loading,
    dossiers,
    links,
    names,
    onagre,
    dossierIds,
    prepare,
    pageSelectors,
    selectedPage,
  }: Props = $props();
</script>

<h2 class="fr-mb-2w">
  {showAll
    ? `Tous les dossiers du fichier chargé (${allRows.length})`
    : `Dossiers restants à importer (${remaining} / ${allRows.length})`}
</h2>
<p>Nombre de dossiers avec des alertes : {alertCount}</p>
<div class="fr-toggle">
  <input type="checkbox" class="fr-toggle__input" id="toggle" bind:checked={showAll} /><label
    class="fr-toggle__label before:max-w-[5rem]"
    for="toggle"
    data-fr-checked-label="Activé"
    data-fr-unchecked-label="Désactivé">Afficher tous les dossiers</label
  >
</div>
<div class="flex flex-row items-center">
  <div>{remaining} / {allRows.length}</div>
  <div
    class="fr-progress-bar flex-1 h-6 fr-ml-2w rounded-[8px] overflow-hidden bg-[var(--background-alt-grey)]"
  >
    <div
      style="width: {percentage}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
    ></div>
  </div>
</div>
{#await loading}<p class="fr-mt-4w">Préparation du fichier en cours…</p>{:then}
  <div class="fr-table">
    <div class="fr-table__wrapper">
      <div class="fr-table__container">
        <div class="fr-table__content">
          <table>
            <thead><tr><th>Nom du projet</th><th>Détails</th><th>Actions</th></tr></thead><tbody>
              {#each rows as row, index}
                {@const dossier = dossiers.get(row)}{@const alerts = dossier?.alertes}
                <tr
                  data-row-key={index}
                  data-testid={alerts?.length ? undefined : "dossier-sans-alerte(s)"}
                >
                  <td>{createDossierName(row)}</td>
                  <td
                    ><ModalButton id={`dsfr-modale-${index}`}>
                      {#snippet openButton()}<button
                          type="button"
                          class="fr-btn fr-btn--sm {alerts?.length
                            ? 'fr-btn--icon-left fr-icon-warning-line'
                            : 'fr-btn--secondary'}"
                          data-fr-opened="false"
                          aria-controls={`dsfr-modale-${index}`}
                          >{alerts?.length
                            ? `Voir les alertes (${alerts.length})`
                            : "Voir les détails"}</button
                        >{/snippet}
                      {#snippet content()}
                        {#if alerts?.length}<h3 class="fr-mb-2w">Liste des alertes&nbsp;:</h3>
                          <ul class="list-none">
                            {#each alerts as alert}<li>
                                <p
                                  class="fr-badge {alert.type === 'avertissement'
                                    ? 'fr-badge--warning'
                                    : 'fr-badge--error'}"
                                >
                                  {alert.type}
                                </p>
                                &nbsp;:&nbsp;{alert.message}
                              </li>{/each}
                          </ul>{/if}
                        <ExpandCollapse open={alerts?.length === 0}
                          >{#snippet summary()}<h3>
                              Données du dossier pour le pré-remplissage&nbsp;:
                            </h3>{/snippet}{#snippet content()}<pre
                              class="whitespace-pre-wrap">{JSON.stringify(
                                dossier,
                                null,
                                2,
                              )}</pre>{/snippet}</ExpandCollapse
                        >
                      {/snippet}
                    </ModalButton></td
                  >
                  <td
                    >{#if isDossierRowInDatabase(row, names, onagre)}<p
                        class="fr-badge fr-badge--success"
                      >
                        En base de données
                      </p>
                      <a
                        href={`/dossier/${dossierIds.get(createDossierName(row))}`}
                        target="_blank"
                        class="fr-btn fr-btn--secondary fr-ml-2w">Ouvrir dossier</a
                      >{:else if links.get(row)}<a
                        href={links.get(row)}
                        target="_blank"
                        class="fr-btn">Créer dossier</a
                      >{:else}<button
                        type="button"
                        class="fr-btn fr-btn--secondary"
                        onclick={() => prepare(row)}>Préparer préremplissage</button
                      >{/if}</td
                  >
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
  {#if pageSelectors}<Pagination {pageSelectors} currentPage={pageSelectors[selectedPage]} />{/if}
{:catch error}<p class="fr-alert fr-alert--error fr-mt-4w">
    Une erreur est survenue lors de la préparation du fichier : {error instanceof Error
      ? error.message
      : error}
  </p>{/await}
