<script lang="ts">
  import TagResultatControle from "../../TagResultatControle.svelte";
  import type Controle from "@pitchou/types/database/public/Controle.ts";
  type Props = {
    description?: string | null;
    articleNumber?: string | null;
    lastControle?: Partial<Controle>;
  };
  let { description, articleNumber, lastControle }: Props = $props();
</script>

<h6>
  <TagResultatControle result={lastControle?.result || "(non renseigné)"} />
  {#if description}{description}{:else if articleNumber}Numéro article&nbsp;:&nbsp;{articleNumber}{:else}(Prescription
    non renseignée){/if}
</h6>
