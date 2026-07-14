<script lang="ts">
  import { deleteAvisExpert as deleteAvisExpertServer } from "./avisExpert.ts";
  import { refreshDossierComplet } from "$lib/dossier/dossier.ts";
  import { envoyerEvenement } from "$lib/shared/aarri.ts";
  import AvisExpert from "./Avis/AvisExpert.svelte";
  import { differenceInDays } from "date-fns";
  import ModaleAjouterPieceJointe from "./ModaleAjouterPieceJointe.svelte";

  import type { DossierComplet, FrontEndAvisExpert } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierComplet;
  };

  let { dossier }: Props = $props();

  const idModalAddPieceJointeAvis = "modale-ajouter-piece-jointe-avis";

  let sortedAvisExpert = $derived(
    [...dossier.avisExpert].sort((a, b) => {
      const dateA = new Date(a.date_avis ?? a.date_saisine ?? 0);
      const dateB = new Date(b.date_avis ?? b.date_saisine ?? 0);
      return differenceInDays(dateB, dateA);
    }),
  );

  async function deleteAvisExpert(avisExpert: FrontEndAvisExpert) {
    await deleteAvisExpertServer(avisExpert);
    await refreshDossierComplet(dossier.id);
  }
</script>

<div class="section-list-avis-expert">
  <h2>Avis d'experts</h2>
  {#if sortedAvisExpert.length >= 1}
    <div class="list-avis-expert">
      {#each sortedAvisExpert as avisExpert}
        <AvisExpert dossierId={dossier.id} {avisExpert} {deleteAvisExpert} />
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
    class="fr-btn fr-mt-3w {sortedAvisExpert.length === 0
      ? ''
      : 'fr-btn--secondary'} fr-btn--icon-left fr-icon-attachment-line"
    aria-controls={idModalAddPieceJointeAvis}
    data-fr-opened="false"
    onclick={() =>
      envoyerEvenement({
        type: "ouvrirModaleAjouterPieceJointe",
        détails: { dossierId: dossier.id, source: "ongletAvis" },
      })}
  >
    Ajouter un avis ou une saisine
  </button>
</div>

<ModaleAjouterPieceJointe id={idModalAddPieceJointeAvis} {dossier} source="ongletAvis" />

<style lang="scss">
  .section-list-avis-expert {
    display: flex;
    flex-direction: column;
  }
  .list-avis-expert {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }
</style>
