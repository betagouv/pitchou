<script lang="ts">
  import type { OnagreTable, OnagreMapping } from "@pitchou/types/onagre.ts";
  let { tables, mappings }: { tables: OnagreTable[]; mappings: OnagreMapping[] } = $props();
  let name = $state("demandes");
  let table = $derived(tables.find((t) => t.name === name));
</script>

<section class="admin-panel">
  <h2>Structure et exemples du dump</h2>
  <label for="source-table">Table Onagre</label><select
    class="fr-select"
    id="source-table"
    bind:value={name}
    >{#each tables as item}<option value={item.name}
        >{item.name} · {item.count.toLocaleString("fr-FR")} lignes</option
      >{/each}</select
  >
  {#if table}<p>
      {table.columns.length} colonnes · {table.count.toLocaleString("fr-FR")} lignes dans le dump. Les
      trois premiers exemples ne représentent pas toutes les valeurs possibles.
    </p>
    <div class="onagre-table-scroll">
      <table>
        <caption>Exemples de {table.name}</caption><thead
          ><tr
            ><th>Champ source</th>{#each table.samples as _, i}<th>Exemple {i + 1}</th>{/each}</tr
          ></thead
        ><tbody
          >{#each table.columns as column}<tr
              ><th scope="row"
                >{column}
                <p class="onagre-context">
                  {mappings.find((m) => m.key === `field:${table.name}.${column}`)?.context}
                </p></th
              >{#each table.samples as sample}<td>{sample[column] ?? "Non renseigné"}</td
                >{/each}</tr
            >{/each}</tbody
        >
      </table>
    </div>
  {:else}<p>Aucun dump chargé.</p>{/if}
</section>
