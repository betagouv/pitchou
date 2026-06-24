<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";

  import ListeDossiers from "$lib/components/ListeDossiers/ListeDossiers.svelte";

  type Props = {
    email?: string;
    dossiers: DossierRésumé[];
    relationSuivis?: PitchouState["relationSuivis"];
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let { email = "", dossiers = [], relationSuivis, notificationParDossier }: Props = $props();
</script>

<svelte:head>
  <title>Mes dossiers — Pitchou</title>
</svelte:head>

{#snippet messageListeVide({ listeComplèteVide }: { listeComplèteVide: boolean })}
  {#if listeComplèteVide}
    <p>
      Vous ne suivez aucun dossier pour le moment. Vous pouvez consulter
      <a class="fr-link" href="/tous-les-dossiers">tous les dossiers</a> pour commencer à en suivre.
    </p>
  {:else}
    <p>Aucun dossier n'a été trouvé.</p>
  {/if}
{/snippet}

<ListeDossiers
  titre="Mes dossiers"
  {email}
  {dossiers}
  {relationSuivis}
  afficherFiltreActionInstructeur
  {notificationParDossier}
  {messageListeVide}
/>
