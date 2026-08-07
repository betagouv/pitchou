<script lang="ts">
  import { onMount } from "svelte";

  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  import type { TaxrefRow } from "@pitchou/ui/taxref/taxrefList.ts";
  import Loader from "@pitchou/ui/Loader.svelte";
  import { loadEspecesProtegeesAdmin } from "$lib/actions/adminEspeces.ts";

  import Modal from "../Modal.svelte";
  import SelectorEspece from "./SelectorEspece.svelte";
  import SelectorTaxref from "./SelectorTaxref.svelte";

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
      especes = await loadEspecesProtegeesAdmin();
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

<Modal
  title={titre}
  size={step === "choix" ? "default" : "xlarge"}
  headerStart={step === "choix" ? undefined : backButton}
  {onClose}
>
  {#if step === "choix"}
    <div class="flex flex-col gap-3 fr-p-3w">
      <button
        type="button"
        class="flex flex-col gap-1 text-left fr-p-2w border border-[color:var(--border-default-grey)] rounded-[0.25rem] bg-[var(--background-default-grey)] cursor-pointer hover:bg-[var(--background-alt-grey)]"
        onclick={() => (step = "selecteur")}
      >
        <span class="fr-text--bold">Modifier une espèce protégée existante</span>
        <span class="text-[color:var(--text-mention-grey)] text-[0.875rem]"
          >{sousTitreExistante}</span
        >
      </button>
      <button
        type="button"
        class="flex flex-col gap-1 text-left fr-p-2w border border-[color:var(--border-default-grey)] rounded-[0.25rem] bg-[var(--background-default-grey)] cursor-pointer hover:bg-[var(--background-alt-grey)]"
        onclick={() => (step = "taxref")}
      >
        <span class="fr-text--bold">Ajouter une nouvelle espèce protégée</span>
        <span class="text-[color:var(--text-mention-grey)] text-[0.875rem]"
          >Rechercher une espèce dans le référentiel TAXREF</span
        >
      </button>
    </div>
  {:else if step === "selecteur"}
    {#if loading}
      <div class="fr-p-3w"><Loader /></div>
    {:else if error}
      <div class="fr-p-3w">
        <div class="fr-alert fr-alert--error fr-alert--sm" role="alert">
          <p>{error}</p>
        </div>
      </div>
    {:else}
      <SelectorEspece {especes} {existingCdRefs} onSelect={onSelectExistante} />
    {/if}
  {:else}
    <SelectorTaxref existingCdRefs={protectedCdRefs} onSelect={onSelectTaxref} />
  {/if}
</Modal>
