<script lang="ts">
  import { tick } from "svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import DossiersResults from "./DossiersResults.svelte";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { Snippet } from "svelte";
  import { PAGE_SIZES, type SortKey } from "./query.ts";

  type Props = {
    dossiers: DossierSummary[];
    readOnly?: boolean;
    sortKey: SortKey;
    requestedPage: number;
    pageSize: number;
    onPageSizeChange: (pageSize: number) => void;
    searchText: string;
    wholeListEmpty: boolean;
    followedIds: Set<Dossier["id"]>;
    notificationViewed: (id: Dossier["id"]) => boolean;
    notificationUpdatedAt: (id: Dossier["id"]) => Date | string | null;
    follow: (id: Dossier["id"]) => Promise<void>;
    leave: (id: Dossier["id"]) => Promise<void>;
    navigatePage: (page: number) => void;
    emptyListMessage?: Snippet<[{ wholeListEmpty: boolean }]>;
  };
  let {
    dossiers,
    readOnly = false,
    sortKey,
    requestedPage,
    pageSize,
    onPageSizeChange,
    searchText,
    wholeListEmpty,
    followedIds,
    notificationViewed,
    notificationUpdatedAt,
    follow,
    leave,
    navigatePage,
    emptyListMessage,
  }: Props = $props();
  const pageCount = $derived(Math.max(1, Math.ceil(dossiers.length / pageSize)));
  const currentPage = $derived(Math.min(Math.max(1, requestedPage), pageCount));
  const displayed = $derived(dossiers.slice(pageSize * (currentPage - 1), pageSize * currentPage));
  let title: HTMLHeadingElement | undefined = $state();
  const selectors = $derived.by<undefined | [undefined, ...(() => void)[]]>(() => {
    if (dossiers.length <= pageSize) return undefined;
    return [
      undefined,
      ...Array.from({ length: pageCount }, (_, i) => () => {
        navigatePage(i + 1);
        tick().then(() => title?.focus());
      }),
    ];
  });
</script>

<div class="flex flex-wrap items-center justify-between gap-3">
  <h2
    bind:this={title}
    tabindex="-1"
    class="text-[1rem] fr-text--regular fr-mb-0 focus:[outline:2px_solid_var(--bf500)] focus:[outline-offset:2px]"
  >
    {searchText.trim() ? `Résultats de recherche pour «${searchText}» : ` : ""}Page {currentPage} sur
    {pageCount}
  </h2>
  <div class="flex items-center gap-2">
    <label class="fr-m-0" for="dossiers-page-size">Dossiers par page</label>
    <Select
      id="dossiers-page-size"
      class="w-24 shrink-0"
      options={PAGE_SIZES.map((size) => ({ value: String(size), label: String(size) }))}
      value={String(pageSize)}
      onChange={(value) => onPageSizeChange(Number(value))}
    />
  </div>
</div>
<DossiersResults
  {readOnly}
  dossiers={displayed}
  {sortKey}
  {wholeListEmpty}
  {followedIds}
  {notificationViewed}
  {notificationUpdatedAt}
  {follow}
  {leave}
  {emptyListMessage}
/>
{#if selectors}<Pagination pageSelectors={selectors} currentPage={selectors[currentPage]} />{/if}
