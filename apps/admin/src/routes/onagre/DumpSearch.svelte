<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type { PageData } from "./$types";
  let {
    explorer,
    snapshotId,
  }: { explorer: NonNullable<PageData["explorer"]>; snapshotId: number } = $props();
  let column = $state(untrack(() => explorer.column));
</script>

<form method="GET" class="dump-search">
  <input type="hidden" name="tab" value="dump" />
  <input type="hidden" name="snapshot" value={snapshotId} />
  <input type="hidden" name="table" value={explorer.table} />
  <input type="hidden" name="column" value={column} />
  <div class="onagre-field">
    <label for="row-search">Rechercher dans les lignes</label>
    <input
      id="row-search"
      class="fr-input"
      name="search"
      value={explorer.search}
      maxlength="200"
      placeholder="Texte ou identifiant…"
    />
  </div>
  <div class="onagre-field">
    <label for="search-column">Colonne</label>
    <Select
      id="search-column"
      bind:value={column}
      options={[
        { value: "", label: "Toutes les colonnes" },
        ...explorer.columns.map((value) => ({ value, label: value })),
      ]}
    />
  </div>
  <button class="fr-btn fr-btn--secondary">Rechercher</button>
</form>
