<script lang="ts">
  import { afterNavigate, pushState, replaceState } from "$app/navigation";
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import {
    defaultDossierTab,
    isDossierTabVisible,
    parseDossierTab,
    type DossierTab,
  } from "./Dossier/dossierTabs.ts";
  import Loader from "@pitchou/ui/Loader.svelte";

  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const id = $derived(data.dossierId);

  const dossier = $derived(store.fullDossiers.get(id));
  const email = $derived(store.identité?.email);
  const followRelations = $derived(store.followRelations);
  const notification = $derived(store.notificationByDossier?.get(id));

  const dossierFollowers = $derived(
    followRelations
      ? Array.from(followRelations)
          .filter(([, followedDossiers]) => followedDossiers.has(id))
          .map(([e]) => e)
      : [],
  );

  const currentDossierFollowedByCurrentInstructeur = $derived(
    email ? !!followRelations?.get(email)?.has(id) : false,
  );

  // The server grants the capability only to those allowed to write, so someone
  // the dossier is merely shared with gets no way to leave read-only mode.
  const canEdit = $derived(!!store.capabilities.modifierDossier);

  // The active tab lives in the `tab` query param; legacy links used a hash
  // (#instruction), still honoured as a fallback.
  function tabFromLocation(): DossierTab {
    const url = new URL(location.href);
    return (
      parseDossierTab(url.searchParams.get("tab") ?? "") ??
      parseDossierTab(url.hash) ??
      defaultDossierTab
    );
  }

  // Read-only mode lives in the URL too, so it survives a reload and can be
  // shared as a link.
  function readOnlyFromLocation(): boolean {
    return new URL(location.href).searchParams.get("lecture") === "1";
  }

  let activeTab: DossierTab = $state(defaultDossierTab);
  let readOnly = $state(false);

  // Read-only mode hides some tabs, so a link pointing at one of them — or the
  // tab being read when switching modes — falls back to the default tab.
  function readLocation() {
    readOnly = readOnlyFromLocation();
    const tab = tabFromLocation();
    activeTab = isDossierTabVisible(tab, readOnly) ? tab : defaultDossierTab;
  }

  readLocation();

  // Re-read the URL when navigating between dossiers. Shallow routing keeps the
  // page mounted, and going back through one of its entries fires popstate
  // without an `afterNavigate`, so both are needed.
  afterNavigate(readLocation);

  // Shallow routing: reflect the state in the URL without re-running the loads.
  function syncLocation(newHistoryEntry = false) {
    const url = new URL(location.href);
    // The default tab keeps a clean URL, without the query param.
    if (activeTab === defaultDossierTab) url.searchParams.delete("tab");
    else url.searchParams.set("tab", activeTab);
    if (readOnly) url.searchParams.set("lecture", "1");
    else url.searchParams.delete("lecture");
    url.hash = "";
    (newHistoryEntry ? pushState : replaceState)(url, {});
  }

  function selectTab(tab: DossierTab) {
    activeTab = tab;
    syncLocation();
  }

  function setReadOnly(value: boolean) {
    readOnly = value;
    if (!isDossierTabVisible(activeTab, readOnly)) activeTab = defaultDossierTab;
    // Read-only mode offers no way back — it must look the same to everyone —
    // so it gets its own history entry and the browser's Back button exits it.
    syncLocation(true);
  }
</script>

<svelte:window onpopstate={readLocation} />

{#if dossier && email}
  <Dossier
    {dossier}
    {activeTab}
    onTabChange={selectTab}
    {email}
    {dossierFollowers}
    {currentDossierFollowedByCurrentInstructeur}
    {notification}
    {readOnly}
    onReadOnlyChange={setReadOnly}
    {canEdit}
  />
{:else}
  <div class="fr-p-2w fr-pb-10w">
    <Loader />
  </div>
{/if}
