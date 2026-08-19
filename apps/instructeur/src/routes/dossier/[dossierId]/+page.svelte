<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import { parseDossierTab } from "./Dossier/dossierTabs.ts";
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

  const initialActiveTab = $derived.by(() => {
    const hash = typeof location !== "undefined" ? location.hash : "";
    return parseDossierTab(hash) ?? "detail-du-projet";
  });
</script>

{#if dossier && email}
  <Dossier
    {dossier}
    {initialActiveTab}
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
