<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import Loader from "@pitchou/ui/Loader.svelte";

  import type { PageProps } from "./$types";

  type Tab =
    | "instruction"
    | "projet"
    | "porteur-de-projet"
    | "avis"
    | "controles"
    | "pieces-jointes"
    | "generation-document"
    | "echanges";

  function isValidTab(tab: string): tab is Tab {
    return [
      "instruction",
      "projet",
      "porteur-de-projet",
      "echanges",
      "avis",
      "controles",
      "pieces-jointes",
      "generation-document",
    ].includes(tab);
  }

  let { data }: PageProps = $props();

  const id = $derived(data.dossierId);

  const dossier = $derived(store.fullDossiers.get(id));
  const messages = $derived(store.messagesByDossierId.get(id));
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
    const tab = (typeof location !== "undefined" ? location.hash : "").slice(1);
    return tab && isValidTab(tab) ? tab : "instruction";
  });
</script>

{#if dossier && email}
  <Dossier
    {dossier}
    {initialActiveTab}
    {messages}
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
