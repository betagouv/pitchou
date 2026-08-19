<script lang="ts">
  import { afterNavigate, goto, replaceState } from "$app/navigation";
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

  // Read-only mode is decided by the load, which is also what fetched the
  // matching payload — the two can never disagree.
  const readOnly = $derived(data.readOnly);

  // The read-only dossier is the narrower one the server sends for sharing; it
  // is cached apart from the full dossier, so the mode picks the source.
  const dossier = $derived(readOnly ? store.readOnlyDossiers.get(id) : store.fullDossiers.get(id));
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

  let requestedTab: DossierTab = $state(tabFromLocation());

  // Read-only mode hides some tabs, so a link pointing at one of them falls back
  // to the default tab without losing what the URL asked for.
  const activeTab = $derived(
    isDossierTabVisible(requestedTab, readOnly) ? requestedTab : defaultDossierTab,
  );

  function readTabFromLocation() {
    requestedTab = tabFromLocation();
  }

  // Re-read the URL when navigating between dossiers. Shallow routing keeps the
  // page mounted, and going back through one of its entries fires popstate
  // without an `afterNavigate`, so both are needed.
  afterNavigate(readTabFromLocation);

  // Shallow routing: switching tabs changes nothing the server sends, so it must
  // not re-run the load.
  function selectTab(tab: DossierTab) {
    requestedTab = tab;
    const url = new URL(location.href);
    // The default tab keeps a clean URL, without the query param.
    if (tab === defaultDossierTab) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    url.hash = "";
    replaceState(url, {});
  }

  function setReadOnly(value: boolean) {
    const url = new URL(location.href);
    if (value) url.searchParams.set("lecture", "1");
    else url.searchParams.delete("lecture");
    // The current tab may not exist on the other side of the switch.
    if (!isDossierTabVisible(requestedTab, value)) url.searchParams.delete("tab");
    url.hash = "";
    // A real navigation, unlike the tab: the mode decides which payload the
    // server sends, so the load has to run again. It also gets its own history
    // entry, so the browser's Back button leaves read-only mode.
    void goto(url, { noScroll: true });
  }
</script>

<svelte:window onpopstate={readTabFromLocation} />

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
