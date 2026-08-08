<script lang="ts">
  import TaxrefTable from "./TaxrefTable.svelte";
  import type { TaxrefRow } from "@pitchou/ui/taxref/taxrefList.ts";

  type Props = { rows: TaxrefRow[]; loading: boolean; erreur: string | null };
  let { rows, loading, erreur }: Props = $props();
</script>

{#if erreur}
  <div class="fr-alert fr-alert--error fr-mb-3w">
    <h3 class="fr-alert__title">Erreur lors du chargement de TAXREF</h3>
    <p>{erreur}</p>
  </div>
{:else}
  <div class={loading ? "opacity-50 [transition:opacity_0.15s_ease]" : ""}>
    <TaxrefTable {rows} />
  </div>
{/if}
