<script lang="ts">
  import type { EspèceProtégée } from "$types/especes.d.ts";

  import Modale from "./Modale.svelte";
  import SelecteurEspece from "./SelecteurEspece.svelte";

  type Props = {
    onClose: () => void;
    onSelectExistante: (espece: EspèceProtégée) => void;
    onAjoutHorsReferentiel: () => void;
  };

  let { onClose, onSelectExistante, onAjoutHorsReferentiel }: Props = $props();

  let step = $state<"choix" | "selecteur">("choix");
</script>

{#snippet backButton()}
  <button
    type="button"
    class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-left-line"
    title="Retour"
    aria-label="Retour"
    onclick={() => (step = "choix")}
  ></button>
{/snippet}

<Modale
  title={step === "choix" ? "Ajouter une espèce" : "Choisir une espèce existante"}
  size={step === "selecteur" ? "large" : "default"}
  headerStart={step === "selecteur" ? backButton : undefined}
  {onClose}
>
  {#if step === "choix"}
    <div class="choices">
      <button type="button" class="choice" onclick={() => (step = "selecteur")}>
        <span class="choice-label">Ajouter une espèce existante</span>
        <span class="choice-desc">Rechercher une espèce du référentiel et la modifier</span>
      </button>
      <button type="button" class="choice" onclick={onAjoutHorsReferentiel}>
        <span class="choice-label">Ajouter une espèce hors référentiel</span>
        <span class="choice-desc">Saisir un nouveau CD_REF (ajout Protection Pitchou)</span>
      </button>
    </div>
  {:else}
    <SelecteurEspece onSelect={onSelectExistante} />
  {/if}
</Modale>

<style lang="scss">
  .choices {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1.5rem;
  }

  .choice {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    text-align: left;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.25rem;
    background: var(--background-default-grey);
    cursor: pointer;

    &:hover {
      background: var(--background-alt-grey);
    }

    .choice-label {
      font-weight: 700;
    }

    .choice-desc {
      color: var(--text-mention-grey);
      font-size: 0.875rem;
    }
  }
</style>
