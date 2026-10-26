<script lang="ts">
  import type { OnagreImportOutcome } from "@pitchou/types/onagreImport.ts";
  import ImportFields from "./ImportFields.svelte";
  let { record }: { record: Pick<OnagreImportOutcome, "issues" | "omissions" | "plan"> } = $props();
</script>

{#each record.issues as issue}<p>{issue}</p>{/each}
<ImportFields plan={record.plan} />
{#if record.omissions.length}
  <details class="import-details">
    <summary>Données non reprises</summary>
    <ul>
      {#each record.omissions as omission}<li>{omission}</li>{/each}
    </ul>
  </details>
{/if}
