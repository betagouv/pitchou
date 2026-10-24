<script lang="ts">
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import DumpToolbar from "./DumpToolbar.svelte";
  import DumpTable from "./DumpTable.svelte";
  import { dumpLink } from "./navigation.ts";
  import "./explorer.css";
  let { data, writable }: { data: PageData; writable: boolean } = $props();
  let search = $state("");
  let tables = $derived(
    (data.selected?.tables ?? [])
      .filter((table) => table.name.toLowerCase().includes(search.toLowerCase()))
      .toSorted((a, b) => a.name.localeCompare(b.name)),
  );
  let rowCount = $derived(
    data.selected?.tables.reduce((total, table) => total + table.count, 0) ?? 0,
  );
</script>

<DumpToolbar {data} {writable} />
{#if data.selected}
  <div class="dump-explorer">
    <aside class="admin-panel dump-sidebar" aria-label="Tables du dump">
      <div class="dump-sidebar-heading">
        <strong>{data.selected.tables.length} tables</strong>
        <span class="onagre-context">{rowCount.toLocaleString("fr-FR")} lignes</span>
        <label class="sr-only" for="table-search">Rechercher une table</label>
        <input
          id="table-search"
          class="fr-input"
          bind:value={search}
          placeholder="Rechercher une table…"
        />
      </div>
      <nav class="dump-table-list" aria-label="Choisir une table">
        {#each tables as table}
          <a
            href={dumpLink(page.url, {
              snapshot: data.selected.id,
              table: table.name,
              rowsPage: null,
              row: null,
              search: null,
              column: null,
            })}
            aria-current={data.explorer?.table === table.name ? "page" : undefined}
          >
            <span class="dump-table-name">{table.name}</span>
            <span class="dump-count">{table.count.toLocaleString("fr-FR")}</span>
          </a>
        {:else}<p class="dump-empty">Aucune table correspondante.</p>{/each}
      </nav>
    </aside>
    {#if data.explorer}
      <DumpTable {data} explorer={data.explorer} />
    {:else}
      <section class="admin-panel dump-empty">
        <h2>Charger le contenu complet</h2>
        <p>
          Ce dump a été chargé avec les anciens échantillons. Chargez son paquet complet pour
          explorer toutes les lignes. Les décisions de correspondance seront conservées.
        </p>
      </section>
    {/if}
  </div>
{:else}
  <section class="admin-panel dump-empty">
    <h2>Aucun dump chargé</h2>
    <p>Chargez un dump pour parcourir ses tables et consulter chaque ligne.</p>
  </section>
{/if}
