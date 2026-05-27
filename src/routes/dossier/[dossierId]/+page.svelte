<script>
  //@ts-check
  import { store } from "$front/store.svelte.ts";
  import Dossier from "$front/components/screens/Dossier.svelte";
  import SqueletteContenuVide from "$front/components/SqueletteContenuVide.svelte";

  /** @import {PageProps} from './$types' */
  /** @typedef {'instruction' | 'projet' | 'avis' | 'controles' | 'generation-document' | 'echanges'} Onglet */

  /** @param {string} onglet @returns {onglet is Onglet} */
  function isOngletValide(onglet) {
    return [
      "instruction",
      "projet",
      "echanges",
      "avis",
      "controles",
      "generation-document",
    ].includes(onglet);
  }

  /** @type {PageProps} */
  let { data } = $props();

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
