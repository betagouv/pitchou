<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  import type { PageData } from "./$types";
  import { dumpLink } from "./navigation.ts";
  let { explorer }: { explorer: NonNullable<PageData["explorer"]> } = $props();
  const close = () => goto(dumpLink(currentUrl, { row: null }), { reset: false });
  let currentUrl = $derived(page.shallow?.url ?? page.url);
</script>

<WorkspaceDialog
  title={`${explorer.table} · ligne ${explorer.selected!.row_number}`}
  onClose={close}
  triggerSelector={`.dump-row-link[aria-label="Ouvrir la ligne ${explorer.selected!.row_number}"]`}
>
  <div class="dump-row-detail">
    <p class="onagre-context">
      Valeurs du dump, sans transformation. NULL indique une valeur absente, "" une chaîne vide.
    </p>
    <dl>
      {#each explorer.columns as column}
        <div>
          <dt>{column}</dt>
          <dd class:dump-null={explorer.selected!.content[column] === null}>
            {explorer.selected!.content[column] === null
              ? "NULL"
              : explorer.selected!.content[column] === ""
                ? '""'
                : explorer.selected!.content[column]}
          </dd>
        </div>
      {/each}
    </dl>
  </div>
</WorkspaceDialog>
