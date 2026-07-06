<script lang="ts">
  import { supprimerAvisExpert as supprimerAvisExpertServeur } from "./avisExpert.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
  import { envoyerÉvènement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModaleAjouterPièceJointe from "./ModaleAjouterPièceJointe.svelte";

  import type { DossierComplet, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

  const idModaleAjouterPieceJointeAvis = "modale-ajouter-piece-jointe-avis";

  let avisExpertTriés = $derived(
    [...dossier.avisExpert].sort((a, b) => {
      const dateA = new Date(a.date_avis ?? a.date_saisine ?? 0);
      const dateB = new Date(b.date_avis ?? b.date_saisine ?? 0);
      return differenceInDays(dateB, dateA);
    }),
  );

  async function supprimerAvisExpert(avisExpert: FrontEndAvisExpert) {
    await supprimerAvisExpertServeur(avisExpert);
    await refreshDossierComplet(dossier.id);
  }
</script>

<div class="section-liste-avis-expert">
  <h2>Avis d'experts</h2>
  {#if avisExpertTriés.length >= 1}
    <div class="liste-avis-expert">
      {#each avisExpertTriés as avisExpert}
        <AvisExpert dossierId={dossier.id} {avisExpert} {supprimerAvisExpert} />
      {/each}
    </div>
  {:else}
    <p>
      <span class="fr-mb-3w"
        >Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.</span
      >
    </p>
  {/if}
  <button
    type="button"
    class="fr-btn fr-mt-3w {avisExpertTriés.length === 0
      ? ''
      : 'fr-btn--secondary'} fr-btn--icon-left fr-icon-attachment-line"
    aria-controls={idModaleAjouterPieceJointeAvis}
    data-fr-opened="false"
    onclick={() =>
      envoyerÉvènement({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: dossier.id, source: "ongletAvis" },
      })}
  >
    Ajouter un avis ou une saisine
  </button>
</div>

<ModaleAjouterPièceJointe id={idModaleAjouterPieceJointeAvis} {dossier} source="ongletAvis" />

<style lang="scss">
  .section-liste-avis-expert {
    display: flex;
    flex-direction: column;
  }
  .liste-avis-expert {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
