<script lang="ts">
  import { store } from "$lib/state/store.svelte.ts";
  import Dossier from "./Dossier.svelte";
  import SqueletteContenuVide from "$lib/components/SqueletteContenuVide.svelte";

  import type { PageProps } from "./$types";

  type Onglet =
    | "instruction"
    | "projet"
    | "avis"
    | "controles"
    | "generation-document"
    | "echanges";

  function isOngletValide(onglet: string): onglet is Onglet {
    return [
      "instruction",
      "projet",
      "echanges",
      "avis",
      "controles",
      "generation-document",
    ].includes(onglet);
  }

  let { data }: PageProps = $props();

  const id = $derived(data.dossierId);

  const dossier = $derived(store.dossiersComplets.get(id));
  const messages = $derived(store.messagesParDossierId.get(id));
  const email = $derived(store.identité?.email);
  const résultatsSynchronisationDS88444 = $derived(store.résultatsSynchronisationDS88444);
  const relationSuivis = $derived(store.relationSuivis);
  const notification = $derived(store.notificationParDossier?.get(id));

  const personnesQuiSuiventDossier = $derived(
    relationSuivis
      ? Array.from(relationSuivis)
          .filter(([, dossiersSuivis]) => dossiersSuivis.has(id))
          .map(([e]) => e)
      : [],
  );

  const dossierActuelSuiviParInstructeurActuel = $derived(
    email ? !!relationSuivis?.get(email)?.has(id) : false,
  );

  const ongletActifInitial = $derived.by(() => {
    const onglet = (typeof location !== "undefined" ? location.hash : "").slice(1);
    return onglet && isOngletValide(onglet) ? onglet : "instruction";
  });
</script>

{#if dossier && email}
  <Dossier
    {dossier}
    {ongletActifInitial}
    {messages}
    {email}
    {résultatsSynchronisationDS88444}
    {personnesQuiSuiventDossier}
    {dossierActuelSuiviParInstructeurActuel}
    {notification}
  />
{:else}
  <SqueletteContenuVide />
{/if}
