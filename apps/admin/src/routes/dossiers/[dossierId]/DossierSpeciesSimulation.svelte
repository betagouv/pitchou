<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import { simulateDossierSpecies, type SimulatedAction } from "$lib/actions/adminDossierSync.ts";

  let {
    dossierId,
    groups,
    onSimulated,
  }: {
    dossierId: number;
    groups: { id: string | null; label: string }[];
    onSimulated: (actions: SimulatedAction[]) => void;
  } = $props();
  const options = $derived(
    groups.map(({ id, label }) => ({
      value: id ?? "unspecified",
      label: id ? `${label} (${id})` : label,
    })),
  );
  let selected = $state(untrack(() => options[0]?.value ?? ""));
  let saving = $state(false);
  let message = $state("");
  let errorMessage = $state("");

  async function simulate() {
    if (saving || !selected) return;
    saving = true;
    message = "";
    errorMessage = "";
    try {
      const result = await simulateDossierSpecies(
        dossierId,
        selected === "unspecified" ? null : selected,
      );
      message = result.message;
      onSimulated(result.actions);
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : String(error);
    } finally {
      saving = false;
    }
  }
</script>

<section class="fr-mt-3w border-t border-[color:var(--border-default-grey)] pt-4">
  <h3 class="fr-text--bold fr-text--md fr-mb-1w">Espèces impactées</h3>
  {#if groups.length}
    <p class="fr-hint-text fr-mb-2w">
      Modifie une quantité pour une espèce du groupe choisi et crée une nouvelle modification à
      valider. Le fichier original reste inchangé. Actualisez ensuite le dossier dans l'application
      instructeurs, onglet « Détail du projet », pour voir le groupe surligné et le bouton « Vu ».
    </p>
    <label class="fr-label" for="simulation-especes-groupe">Groupe d'impact à modifier</label>
    <Select id="simulation-especes-groupe" {options} bind:value={selected} disabled={saving} />
    <button
      type="button"
      class="fr-btn fr-btn--secondary fr-mt-2w"
      disabled={saving || !selected}
      onclick={simulate}
      >{saving ? "Simulation en cours…" : "Simuler une modification d'espèces"}</button
    >
    {#if message}
      <p class="fr-success-text" role="status">{message}</p>
    {/if}
    {#if errorMessage}<p class="fr-error-text" role="alert">{errorMessage}</p>{/if}
  {:else}
    <p class="fr-hint-text">
      Aucune espèce importée dans ce dossier. Choisissez un dossier contenant déjà des espèces
      impactées pour tester leurs modifications.
    </p>
  {/if}
</section>
