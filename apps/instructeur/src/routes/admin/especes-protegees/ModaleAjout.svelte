<script lang="ts">
  import { onMount } from "svelte";

  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  import type { TaxrefRow } from "../../taxref/taxrefList.ts";
  import Loader from "$lib/components/Loader.svelte";
  import { chargerEspecesProtegeesAdmin } from "$lib/actions/adminEspeces.ts";

  import Modale from "./Modale.svelte";
  import SelecteurEspece from "./SelecteurEspece.svelte";
  import SelecteurTaxref from "./SelecteurTaxref.svelte";

  type Props = {
    onClose: () => void;
    /** CD_REFs already covered by a modification (flagged in the espece selector). */
    existingCdRefs: Set<string>;
    onSelectExistante: (espece: EspeceProtegee) => void;
    onSelectTaxref: (row: TaxrefRow) => void;
  };

  let { onClose, existingCdRefs, onSelectExistante, onSelectTaxref }: Props = $props();

  let step = $state<"choix" | "selecteur" | "taxref">("choix");

  // The protected list is loaded once: it feeds the espece selector (option 1) and the
  // set of already-protected CD_REFs flagged in the TAXREF selector (option 2).
  let especes = $state<EspeceProtegee[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      especes = await chargerEspecesProtegeesAdmin();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  });

  const protectedCdRefs = $derived(new Set(especes.map((espece) => espece.CD_REF)));

  const titre = $derived(
    step === "selecteur"
      ? "Modifier une espèce protégée existante"
      : step === "taxref"
        ? "Ajouter une nouvelle espèce protégée"
        : "Ajouter une espèce",
  );

  const sousTitreExistante = $derived(
    loading
      ? "Rechercher une espèce protégée et la modifier"
      : `Rechercher une espèce parmi les ${especes.length.toLocaleString("fr-FR")} et la modifier`,
  );
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
  title={titre}
  size={step === "choix" ? "default" : "xlarge"}
  headerStart={step === "choix" ? undefined : backButton}
  {onClose}
>
  {#if step === "choix"}
    <div class="choices">
      <button type="button" class="choice" onclick={() => (step = "selecteur")}>
        <span class="choice-label">Modifier une espèce protégée existante</span>
        <span class="choice-desc">{sousTitreExistante}</span>
      </button>
      <button type="button" class="choice" onclick={() => (step = "taxref")}>
        <span class="choice-label">Ajouter une nouvelle espèce protégée</span>
        <span class="choice-desc">Rechercher une espèce dans le référentiel TAXREF</span>
      </button>
    </div>
  {:else if step === "selecteur"}
    {#if loading}
      <div class="loader-wrap"><Loader /></div>
    {:else if error}
      <div class="alert-wrap">
        <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
          <p>{error}</p>
        </div>
      </div>
    {:else}
      <SelecteurEspece {especes} {existingCdRefs} onSelect={onSelectExistante} />
    {/if}
  {:else}
    <SelecteurTaxref existingCdRefs={protectedCdRefs} onSelect={onSelectTaxref} />
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

  .loader-wrap,
  .alert-wrap {
    padding: 1.5rem;
  }
</style>
