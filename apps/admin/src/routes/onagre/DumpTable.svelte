<script lang="ts">
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import DumpSearch from "./DumpSearch.svelte";
  import DumpRowDetail from "./DumpRowDetail.svelte";
  import { dumpLink } from "./navigation.ts";
  let { data, explorer }: { data: PageData; explorer: NonNullable<PageData["explorer"]> } =
    $props();
  let structure = $derived(page.url.searchParams.get("view") === "structure");
  const display = (value: string | null) => (value === null ? "NULL" : value === "" ? '""' : value);
</script>

<section class="admin-panel dump-data" aria-label={`Contenu de ${explorer.table}`}>
  <div class="dump-data-heading">
    <div>
      <h2>{explorer.table}</h2>
      <span class="onagre-context"
        >{explorer.total.toLocaleString("fr-FR")} lignes{explorer.search ? " trouvées" : ""} · {explorer
          .columns.length} colonnes</span
      >
    </div>
    <nav class="dump-switch" aria-label="Affichage de la table">
      <a
        href={dumpLink(page.url, { view: null, row: null })}
        aria-current={!structure ? "page" : undefined}>Données</a
      >
      <a
        href={dumpLink(page.url, { view: "structure", row: null })}
        aria-current={structure ? "page" : undefined}>Structure</a
      >
    </nav>
  </div>
  {#if structure}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex: keyboard users need to scroll the table. -->
    <div
      class="onagre-table-scroll dump-grid"
      tabindex="0"
      role="region"
      aria-label="Colonnes de la table"
      data-structure
    >
      <table>
        <thead><tr><th>Colonne</th><th>Description source</th></tr></thead>
        <tbody
          >{#each explorer.columns as column}<tr
              ><th scope="row">{column}</th>
              <td
                >{data.mappings.find((m) => m.key === `field:${explorer.table}.${column}`)
                  ?.context || "Aucune description"}</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
  {:else}
    {#key `${data.selected?.id}:${explorer.table}:${explorer.search}:${explorer.column}`}<DumpSearch
        {explorer}
        snapshotId={data.selected!.id}
      />{/key}
    <!-- svelte-ignore a11y_no_noninteractive_tabindex: keyboard users need to scroll the table. -->
    <div
      class="onagre-table-scroll dump-grid"
      tabindex="0"
      role="region"
      aria-label={`Lignes de ${explorer.table}`}
    >
      <table>
        <thead
          ><tr
            ><th scope="col">Ligne</th>{#each explorer.columns as column}<th scope="col"
                >{column}</th
              >{/each}</tr
          ></thead
        >
        <tbody
          >{#each explorer.rows as row}<tr>
              <th scope="row"
                ><a
                  class="dump-row-link"
                  aria-label={`Ouvrir la ligne ${row.row_number}`}
                  href={dumpLink(page.url, { row: row.row_number })}>{row.row_number}</a
                ></th
              >
              {#each explorer.columns as column}<td
                  ><a
                    href={dumpLink(page.url, { row: row.row_number })}
                    tabindex="-1"
                    title={row.content[column] ?? "NULL"}
                    class:dump-null={row.content[column] === null}>{display(row.content[column])}</a
                  ></td
                >{/each}
            </tr>{/each}</tbody
        >
      </table>
      {#if !explorer.rows.length}<p class="dump-empty">
          {explorer.search
            ? "Aucune ligne ne correspond à cette recherche."
            : "Cette table est vide."}
        </p>{/if}
    </div>
    <nav class="dump-pagination" aria-label="Pagination des lignes">
      <span
        >Page {explorer.page.toLocaleString("fr-FR")} sur {explorer.pages.toLocaleString(
          "fr-FR",
        )}</span
      >
      <div>
        {#if explorer.page > 1}
          <a href={dumpLink(page.url, { rowsPage: 1, row: null })}>Première</a>
          <a href={dumpLink(page.url, { rowsPage: explorer.page - 1, row: null })}>Précédente</a>
        {/if}
        {#if explorer.page < explorer.pages}
          <a href={dumpLink(page.url, { rowsPage: explorer.page + 1, row: null })}>Suivante</a>
          <a href={dumpLink(page.url, { rowsPage: explorer.pages, row: null })}>Dernière</a>
        {/if}
      </div>
    </nav>
  {/if}
</section>
{#if explorer.selected}<DumpRowDetail {explorer} />{/if}
