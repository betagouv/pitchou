<script lang="ts">
  import { tick } from "svelte";
  import Pagination from "@pitchou/ui/DSFR/Pagination.svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import DossiersResults from "./DossiersResults.svelte";
  import EditNextDueDateModal from "#lib/components/EditNextDueDateModal.svelte";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { Snippet } from "svelte";
  import { PAGE_SIZES, type SortKey } from "./query.ts";

  type Props = {
    dossiers: DossierSummary[];
    serverTotal?: number;
    busy?: boolean;
    onRefresh?: () => void;
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
    serverTotal,
    busy = false,
    onRefresh,
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
  const total = $derived(serverTotal ?? dossiers.length);
  const pageCount = $derived(Math.max(1, Math.ceil(total / pageSize)));
  const currentPage = $derived(Math.min(Math.max(1, requestedPage), pageCount));
  const displayed = $derived(
    serverTotal === undefined
      ? dossiers.slice(pageSize * (currentPage - 1), pageSize * currentPage)
      : dossiers,
  );
  let results: HTMLDivElement | undefined = $state();
  // A save can move the card to another month or page before the server responds.
  let editingDueDate: Pick<DossierSummary, "id" | "name"> | undefined = $state();

  async function closeDueDateEditor() {
    const id = editingDueDate?.id;
    editingDueDate = undefined;
    onRefresh?.();
    await tick();
    const trigger = document.querySelector<HTMLButtonElement>(
      `button[aria-controls="dossier-actions-menu-${id}"]`,
    );
    (trigger ?? results)?.focus();
  }
  const selectors = $derived.by<undefined | [undefined, ...(() => void)[]]>(() => {
    if (total <= pageSize) return;
    return [
      undefined,
      ...Array.from({ length: pageCount }, (_, i) => () => {
        navigatePage(i + 1);
        tick().then(() => results?.focus());
      }),
    ];
  });
</script>

<div class="flex flex-wrap items-center justify-end gap-3">
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
<div
  bind:this={results}
  role="region"
  aria-busy={busy}
  aria-label={searchText.trim()
    ? `Résultats de recherche pour «${searchText}»`
    : "Liste des dossiers"}
  tabindex="-1"
  class="focus:[outline:2px_solid_var(--bf500)] focus:[outline-offset:2px]"
>
  <DossiersResults
    {onRefresh}
    onEditDueDate={(dossier) => (editingDueDate = dossier)}
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
</div>
{#if selectors}<Pagination pageSelectors={selectors} currentPage={selectors[currentPage]} />{/if}

{#if editingDueDate}
  <EditNextDueDateModal
    dossierId={editingDueDate.id}
    dossierName={editingDueDate.name}
    onClose={closeDueDateEditor}
  />
{/if}
