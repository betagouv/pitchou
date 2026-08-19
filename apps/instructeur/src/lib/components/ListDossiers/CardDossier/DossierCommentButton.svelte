<script lang="ts">
  import { formatLocalisation, formatPorteurDeProjet } from "$lib/dossier/displayDossier.ts";
  import ModalButton from "$lib/components/DSFR/ModalButton.svelte";
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";

  type Props = {
    dossier: DossierSummary;
  };

  let { dossier }: Props = $props();

  const modalId = $derived(`dsfr-modale-commentaire-${dossier.id}`);
</script>

<ModalButton id={modalId}>
  {#snippet openButton()}
    <button
      type="button"
      class="fr-btn fr-icon-chat-3-line fr-btn--tertiary-no-outline fr-btn--sm"
      aria-controls={modalId}
      data-fr-opened="false"
    >
      Commentaire
    </button>
  {/snippet}
  {#snippet content()}
    <header>
      <h1 class="fr-modal__title mb-[0.8rem]">
        Commentaire dossier {dossier.name}
      </h1>
      <h2 class="fr-modal__title mb-[0.6rem] text-[1.1rem]">
        {formatPorteurDeProjet(dossier)}
        &nbsp;-&nbsp;
        {formatLocalisation(dossier)}
      </h2>
    </header>
    <div class="[white-space:preserve]">
      {dossier.free_comment}
    </div>
  {/snippet}
</ModalButton>
