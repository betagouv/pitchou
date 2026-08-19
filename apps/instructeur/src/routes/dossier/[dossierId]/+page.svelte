<script lang="ts">
  import { afterNavigate, replaceState } from "$app/navigation";
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import { parseDossierTab, type DossierTab } from "./Dossier/dossierTabs.ts";
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

  // The active tab lives in the `tab` query param; legacy links used a hash
  // (#instruction), still honoured as a fallback.
  function tabFromLocation(): DossierTab {
    const url = new URL(location.href);
    return (
      parseDossierTab(url.searchParams.get("tab") ?? "") ??
      parseDossierTab(url.hash) ??
      "detail-du-projet"
    );
  }

  let activeTab = $state(tabFromLocation());

  // Re-read the URL when navigating between dossiers or through history.
  afterNavigate(() => {
    activeTab = tabFromLocation();
  });

  function selectTab(tab: DossierTab) {
    activeTab = tab;
    const url = new URL(location.href);
    // The default tab keeps a clean URL, without the query param.
    if (tab === "detail-du-projet") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    url.hash = "";
    // Shallow routing: reflect the tab in the URL without re-running the loads.
    replaceState(url, {});
  }
</script>

{#if dossier && email}
  <Dossier
    {dossier}
    {activeTab}
    onTabChange={selectTab}
    {email}
    {dossierFollowers}
    {currentDossierFollowedByCurrentInstructeur}
    {notification}
  />
{:else}
  <div class="fr-p-2w fr-pb-10w">
    <Loader />
  </div>
{/if}
