<script lang="ts">
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import { createDossierName } from "./importDossierBFC.ts";
  import type { DossierBFCRow } from "./importDossierBFC.ts";
  type Props = {
    allRows: DossierBFCRow[];
    rows: DossierBFCRow[];
    showAll: boolean;
    remaining: number;
    percentage?: number;
    dossierIds: Map<string | null, number>;
    links: Map<any, string>;
    isImported: (row: DossierBFCRow) => boolean;
    prepare: (row: DossierBFCRow) => void;
    pageSelectors?: [undefined, ...(() => void)[]];
    selectedPage: number;
  };
  let {
    allRows,
    rows,
    showAll = $bindable(),
    remaining,
    percentage,
    dossierIds,
    links,
    isImported,
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
<div class="fr-toggle">
  <input
    type="checkbox"
    class="fr-toggle__input"
    id="toggle"
    aria-describedby="toggle-messages"
    bind:checked={showAll}
  />
  <label
    class="fr-toggle__label before:max-w-20"
    for="toggle"
    data-fr-checked-label="Activé"
    data-fr-unchecked-label="Désactivé">Afficher tous les dossiers</label
  >
</div>
<div class="flex flex-row items-center">
  <div>{remaining} / {allRows.length}</div>
  <div
    class="fr-progress-bar flex-1 h-6 fr-ml-2w rounded-[8px] overflow-hidden bg-[var(--background-alt-grey)]"
    title={`${remaining} / ${allRows.length}`}
  >
    <div
      style="width: {percentage}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"
    ></div>
  </div>
</div>
<div class="fr-table">
  <div class="fr-table__wrapper">
    <div class="fr-table__container">
      <div class="fr-table__content">
        <table
          class="[&_th]:max-h-8 [&_th]:overflow-auto [&_td:not(:last-of-type)]:max-h-8 [&_td:not(:last-of-type)]:overflow-auto"
        >
          <thead><tr><th>Nom du projet (OBJET)</th><th>Détails</th><th>Actions</th></tr></thead>
          <tbody
            >{#each rows as row, index}<tr data-row-key="1">
                <td>{createDossierName(row)}</td>
                <td
                  ><ModalButton id={`dsfr-modale-${index}`}
                    >{#snippet openButton()}<button type="button">Voir les détails</button
                      >{/snippet}{#snippet content()}<div>
                        {JSON.stringify(row)}
                      </div>{/snippet}</ModalButton
                  ></td
                >
                <td
                  >{#if isImported(row)}<p class="fr-badge fr-badge--success">En base de données</p>
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
              </tr>{/each}</tbody
          >
        </table>
      </div>
    </div>
  </div>
</div>
{#if pageSelectors}<Pagination {pageSelectors} currentPage={pageSelectors[selectedPage]} />{/if}
