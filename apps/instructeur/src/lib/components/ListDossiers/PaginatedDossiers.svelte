<script lang="ts">
  import { tick } from "svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import DossiersResults from "./DossiersResults.svelte";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { Snippet } from "svelte";
  import type { SortKey } from "./query.ts";

  type Props = {
    dossiers: DossierSummary[];
    sortKey: SortKey;
    requestedPage: number;
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
    sortKey,
    requestedPage,
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
  const perPage = 10;
  const pageCount = $derived(Math.max(1, Math.ceil(dossiers.length / perPage)));
  const currentPage = $derived(Math.min(Math.max(1, requestedPage), pageCount));
  const displayed = $derived(dossiers.slice(perPage * (currentPage - 1), perPage * currentPage));
  let title: HTMLHeadingElement | undefined = $state();
  const selectors = $derived.by<undefined | [undefined, ...(() => void)[]]>(() => {
    if (dossiers.length <= perPage) return undefined;
    return [
      undefined,
      ...Array.from({ length: pageCount }, (_, i) => () => {
        navigatePage(i + 1);
        tick().then(() => title?.focus());
      }),
    ];
  });
</script>

<h2
  bind:this={title}
  tabindex="-1"
  class="text-[1rem] fr-text--regular fr-mb-0 ml-auto focus:[outline:2px_solid_var(--bf500)] focus:[outline-offset:2px]"
>
  {searchText.trim() ? `Résultats de recherche pour «${searchText}» : ` : ""}Page {currentPage} sur {pageCount}
</h2>
<DossiersResults
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
