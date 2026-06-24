<script lang="ts">
  import type { DossierRésumé } from "@pitchou/types/API_Pitchou.ts";
  import type { PitchouState } from "$lib/state/store.svelte.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import { instructeurSuitDossier, instructeurLaisseDossier } from "$lib/dossier/suiviDossier.ts";
  import CarteDossier from "./CarteDossier.svelte";

  type Props = {
    dossiers: DossierRésumé[];
    email: string;
    relationSuivis?: PitchouState["relationSuivis"];
    notificationParDossier: PitchouState["notificationParDossier"];
  };

  let { dossiers, email, relationSuivis, notificationParDossier }: Props = $props();

  const followedByCurrentInstructeur = $derived(relationSuivis?.get(email) ?? new Set());

  function followDossier(id: Dossier["id"]) {
    return instructeurSuitDossier(email, id);
  }

  function unfollowDossier(id: Dossier["id"]) {
    return instructeurLaisseDossier(email, id);
  }
</script>

{#if dossiers.length >= 1}
  <div class="liste-des-dossiers fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul>
      {#each dossiers as dossier (dossier.id)}
        <li>
          <CarteDossier
            {dossier}
            instructeurActuelSuitDossier={followDossier}
            instructeurActuelLaisseDossier={unfollowDossier}
            dossierSuiviParInstructeurActuel={followedByCurrentInstructeur.has(dossier.id)}
            nouveautéVueParInstructeur={notificationParDossier.get(dossier.id)?.vue ?? true}
          />
        </li>
      {/each}
    </ul>
  </div>
{:else}
  <p>Aucun dossier n'a été trouvé.</p>
{/if}

<style>
  .liste-des-dossiers {
    background: var(--background-contrast-grey);
  }

  ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  li:not(:last-child) {
    margin-bottom: 1rem;
  }
</style>
