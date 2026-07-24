<script lang="ts">
  import clsx from "clsx";

  import type { TableSort } from "@pitchou/types/interfaceUtilisateur.ts";

  type Props = {
    sorts: TableSort[];
    selectedSort?: TableSort | undefined;
  };

  let { sorts, selectedSort = $bindable(undefined) }: Props = $props();

  const selectSort = (sort: TableSort): void => {
    selectedSort = sort;
    sort.sort();
  };
</script>

<ul class="fr-mt-1w list-none pointer-events-auto fr-p-0">
  {#each sorts as sort}
    <li class="fr-mb-1v flex list-none fr-p-0">
      <button
        class={clsx([
          "fr-pt-1v",
          "fr-pb-1v",
          "text-left bg-[var(--background-overlap-grey)] hover:bg-[var(--background-overlap-grey-hover)] active:bg-[var(--background-overlap-grey-active)] shadow-[inset_0_1px_0_0_var(--border-open-blue-france)]",
          selectedSort === sort
            ? "text-[color:var(--text-active-grey)]"
            : "text-[color:var(--text-mention-grey)]",
        ])}
        type="button"
        onclick={() => {
          selectSort(sort);
        }}
      >
        {sort["nom"]}

        {#if sort === selectedSort}
          <span class="fr-icon-check-line" aria-hidden="true"></span>
        {/if}
      </button>
    </li>
  {/each}
</ul>
