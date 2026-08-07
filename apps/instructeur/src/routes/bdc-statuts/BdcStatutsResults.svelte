<script lang="ts">
  import BdcStatutsTable from "./BdcStatutsTable.svelte";
  import type { BdcStatutRow } from "./bdcStatutsList.ts";

  type Props = { rows: BdcStatutRow[]; loading: boolean; erreur: string | null };
  let { rows, loading, erreur }: Props = $props();
</script>

{#if erreur}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement de BDC-Statuts</h3>
    <p>{erreur}</p>
  </div>
{:else}
  <div class={loading ? "opacity-50 [transition:opacity_0.15s_ease]" : ""}>
    <BdcStatutsTable {rows} />
  </div>
{/if}
