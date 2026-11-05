<script lang="ts">
  import type { ListDossiersProps } from "./props.ts";
  import {
    WITHOUT_INSTRUCTEUR,
    buildDossiersSearchParams,
    copyDossiersQuery,
    countActiveFilters,
    toggleQuickFilter,
  } from "./listModel.ts";
  import {
    instructeurFollowsDossier,
    instructeurLeavesDossier,
  } from "#lib/dossier/suiviDossier.ts";
  import { createListControls } from "./controls.svelte.ts";
  import PaginatedDossiers from "./PaginatedDossiers.svelte";
  import DossiersToolbar from "./DossiersToolbar.svelte";
  import DossiersFilterModal from "./DossiersFilterModal.svelte";
  import DossiersLoadState from "./DossiersLoadState.svelte";
  let props: ListDossiersProps = $props();
  let {
    title,
    server,
    loading = false,
    loadError = "",
    onRetry,
    email = "",
    dossiers,
    followRelations,
    followedOnly = false,
    recentSearches = [],
    showFilterInstructeurice = false,
    showFilterEnjeu = true,
    showFilterActionInstructeur = false,
    showFilterUnread = false,
    notificationByDossier,
    emptyListMessage,
  }: ListDossiersProps = $derived(props);

  const controls = createListControls(() => props);
</script>

<div class="flex flex-col fr-mt-2w">
  <DossiersToolbar
    {title}
    {loading}
    {loadError}
    searchText={controls.query.text}
    {recentSearches}
    {showFilterInstructeurice}
    {showFilterEnjeu}
    {showFilterActionInstructeur}
    {showFilterUnread}
    withoutInstructeurActive={controls.query.instructeur.includes(WITHOUT_INSTRUCTEUR)}
    enjeuActive={controls.query.enjeu}
    actionInstructeurActive={controls.query.actionInstructeur}
    unreadActive={controls.query.nouveaute === "oui"}
    activeFilterCount={countActiveFilters(controls.query)}
    numberFiltered={controls.numberFiltered}
    busy={server?.busy}
    searchDebounce={server ? 300 : 0}
    localisation={controls.query.localisation}
    {followedOnly}
    exportDossierIds={server ? undefined : controls.collection.sortedDossiers.map(({ id }) => id)}
    exportQuery={server ? buildDossiersSearchParams(controls.query).toString() : undefined}
    exportCount={server?.result?.totalDemandes}
    chips={controls.chips}
    sortKey={controls.query.sort}
    sortOrder={controls.query.order}
    onSearch={(text) =>
      controls.applySearch({ ...copyDossiersQuery(controls.query), text, page: 1 })}
    onToggleWithoutInstructeur={() =>
      controls.applySearch(toggleQuickFilter(controls.query, "withoutInstructeur"))}
    onToggleEnjeu={() => controls.applySearch(toggleQuickFilter(controls.query, "enjeu"))}
    onToggleActionInstructeur={() =>
      controls.applySearch(toggleQuickFilter(controls.query, "actionInstructeur"))}
    onToggleUnread={() => controls.applySearch(toggleQuickFilter(controls.query, "nouveaute"))}
    onOpenFilters={controls.openFilters}
    onRemoveFilter={controls.applySearch}
    onSort={controls.onSort}
  />

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if controls.statusMessage}{controls.statusMessage}{/if}
  </div>
</div>

{#if controls.modalOpen}
  <DossiersFilterModal
    showLocalisationScope={!followedOnly}
    open={controls.modalOpen}
    bind:draft={controls.draft}
    {dossiers}
    {followRelations}
    {showFilterInstructeurice}
    options={server?.options}
    numberResults={controls.numberFiltered}
    onApply={controls.applyFilters}
    onClose={controls.closeFilters}
  />
{/if}

{#if loading || (loadError && !server?.result)}
  <DossiersLoadState {loading} {loadError} {onRetry} />
{:else}
  {#if loadError}
    <div class="fr-alert fr-alert--error fr-my-2w" role="alert">
      <p>{loadError} Les résultats précédents restent affichés.</p>
      <button type="button" class="fr-btn fr-btn--secondary" onclick={onRetry}>Réessayer</button>
    </div>
  {/if}
  <PaginatedDossiers
    readOnly={controls.query.localisation === "france"}
    dossiers={controls.displayedDossiers}
    serverTotal={server?.result?.total}
    busy={server?.busy}
    onRefresh={server?.refresh}
    sortKey={controls.query.sort}
    requestedPage={server?.result?.page ?? controls.query.page}
    pageSize={controls.query.pageSize}
    onPageSizeChange={(pageSize) =>
      controls.navigate({ ...copyDossiersQuery(controls.query), pageSize, page: 1 })}
    searchText={controls.query.text}
    wholeListEmpty={server ? server.result?.scopeTotal === 0 : dossiers.length === 0}
    followedIds={followRelations?.get(email) ?? new Set()}
    notificationViewed={(id) => notificationByDossier.get(id)?.viewed ?? true}
    notificationUpdatedAt={(id) => notificationByDossier.get(id)?.updated_at ?? null}
    follow={server?.follow ?? ((id) => instructeurFollowsDossier(email, id))}
    leave={server?.leave ?? ((id) => instructeurLeavesDossier(email, id))}
    navigatePage={(page) => controls.navigate({ ...copyDossiersQuery(controls.query), page })}
    {emptyListMessage}
  />
{/if}
