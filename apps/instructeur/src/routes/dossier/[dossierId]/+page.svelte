<script lang="ts">
  import { afterNavigate, goto, replaceState } from "$app/navigation";
  import { page } from "$app/state";
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import {
    defaultDossierTab,
    isDossierTabVisible,
    parseDossierTab,
    type DossierTab,
  } from "./Dossier/dossierTabs.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { dossierReturnPath } from "./Dossier/navigation.ts";

  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();

  const id = $derived(data.dossierId);

  // Shared dossiers always use their narrowed payload. An owner's preview must
  // wait for the full response before it can render in editable mode.
  const readOnlyDossier = $derived(store.readOnlyDossiers.get(id));
  const dossier = $derived(
    data.readOnly
      ? readOnlyDossier
      : (store.fullDossiers.get(id) ??
          (readOnlyDossier?.access === "lecture" ? readOnlyDossier : undefined)),
  );

  // Either the instructeur asked to preview the dossier, or their service only
  // ever gets to read it — in which case the payload is already narrowed and
  // there is no mode to leave.
  const readOnly = $derived(data.readOnly || dossier?.access === "lecture");
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

  // Per dossier, not per user: one cap is `complet` for the service's own
  // dossiers and `lecture` for those another service shared with it. Someone
  // who cannot edit gets no way out of read-only mode.
  const canEdit = $derived(dossier?.access === "complet" && !!store.capabilities.modifierDossier);

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
  let returnPath = $state<string | undefined>();

  afterNavigate(({ from }) => {
    readTabFromLocation();
    const state = page.state as { dossierReturnPath?: string };
    returnPath =
      dossierReturnPath(from?.url?.href, location.origin) ??
      dossierReturnPath(state.dossierReturnPath, location.origin) ??
      (from?.url?.pathname.startsWith("/dossier/") ? returnPath : undefined);
    if (returnPath) {
      replaceState(new URL(location.href), { ...page.state, dossierReturnPath: returnPath });
    }
  });

  function closeDossier() {
    void goto(
      returnPath ??
        (currentDossierFollowedByCurrentInstructeur ? "/mes-dossiers" : "/tous-les-dossiers"),
      { replaceState: true },
    );
  }

  // Shallow routing: switching tabs changes nothing the server sends, so it must
  // not re-run the load.
  function selectTab(tab: DossierTab) {
    requestedTab = tab;
    const url = new URL(location.href);
    // The default tab keeps a clean URL, without the query param.
    if (tab === defaultDossierTab) url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    url.hash = "";
    replaceState(url, { ...page.state, dossierReturnPath: returnPath });
  }

  function setReadOnly(value: boolean) {
    if (!value && !canEdit) return;
    const url = new URL(location.href);
    if (value) url.searchParams.set("lecture", "1");
    else url.searchParams.delete("lecture");
    requestedTab = defaultDossierTab;
    url.searchParams.delete("tab");
    url.hash = "";
    // A real navigation, unlike the tab: the mode decides which payload the
    // server sends, so the load has to run again. Keep the original list entry
    // rather than putting an editable copy of this dossier in browser history.
    void goto(url, {
      noScroll: true,
      replaceState: true,
      state: { ...page.state, dossierReturnPath: returnPath },
    });
  }
</script>

<svelte:window onpopstate={readTabFromLocation} />

{#if dossier && email}
  <!-- Going from one dossier to the next keeps this page mounted, and the tree
       below holds state seeded from the dossier it was showing: the instruction
       champs waiting to be saved and the date the dossier was last read.
       Keying on the id starts that state over rather than
       carrying one dossier's over to another. -->
  {#key id}
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
      onClose={closeDossier}
    />
  {/key}
{:else}
  <div class="fr-p-2w fr-pb-10w">
    <Loader />
  </div>
{/if}
