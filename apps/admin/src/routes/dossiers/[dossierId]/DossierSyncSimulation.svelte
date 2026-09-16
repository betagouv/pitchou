<script lang="ts">
  import { untrack } from "svelte";
  import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";
  import { simulateDossierSync, type SimulatedAction } from "$lib/actions/adminDossiers.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import DossierSpeciesSimulation from "./DossierSpeciesSimulation.svelte";

  type Props = {
    dossierId: number;
    champs: { column: string; label: string }[];
    /** Dossiers created in Pitchou are never touched by the synchronization. */
    simulable: boolean;
    speciesGroups?: { id: string | null; label: string }[];
  };
  let { dossierId, champs, simulable, speciesGroups = [] }: Props = $props();

  // The list comes from the server and never changes while the page is open.
  let champ = $state(untrack(() => champs[0]?.column ?? ""));
  let valeur = $state("");
  let saving = $state(false);
  let errorMessage = $state("");
  let actions: SimulatedAction[] | undefined = $state();

  function describe(action: SimulatedAction): string {
    const data = (action.data ?? {}) as Record<string, unknown>;
    if (action.type === "especes_renseignees")
      return `Espèces impactées : ${data.label ?? "fichier modifié"}`;
    if (action.type !== "champ_modifie") return action.type;
    const from = typeof data.from === "string" && data.from ? data.from : "(vide)";
    return `Champ ${data.field} : « ${from} » → « ${data.to ?? "(vide)"} »`;
  }

  function formatDate(value: string | Date): string {
    const date = new Date(value);
    return isTimeOfDayKnown(date)
      ? date.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })
      : date.toLocaleDateString("fr-FR");
  }

  async function simulate() {
    saving = true;
    errorMessage = "";
    try {
      const result = await simulateDossierSync(dossierId, champ, valeur);
      actions = result.actions;
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    } finally {
      saving = false;
    }
  }
</script>

<section
  class="fr-mt-4w w-full min-w-0 rounded-lg border border-[color:var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4 sm:p-6"
  aria-labelledby="dossier-simulation-title"
>
  <h2 id="dossier-simulation-title" class="fr-h5 fr-mb-2w">
    Simuler une modification du pétitionnaire
  </h2>
  <div>
    <p class="fr-hint-text fr-mb-2w">
      Rejoue une synchronisation Démarches Numériques sur ce dossier : le champ est réellement
      modifié, l'historique est alimenté et le dossier repasse en non lu pour les personnes qui le
      suivent. Cet outil n'existe qu'en développement et en recette.
    </p>
    {#if !simulable}
      <p class="fr-error-text">
        Ce dossier ne vient pas de Démarches Numériques : la synchronisation ne le touche jamais.
      </p>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
        <div class="fr-select-group">
          <label class="fr-label" for="simulation-champ">Champ modifié</label>
          <Select
            id="simulation-champ"
            class="fr-mt-1w"
            options={champs.map((option) => ({ value: option.column, label: option.label }))}
            bind:value={champ}
          />
        </div>
        <div class="fr-input-group">
          <label class="fr-label" for="simulation-valeur">Nouvelle valeur</label>
          <input class="fr-input" id="simulation-valeur" type="text" bind:value={valeur} />
        </div>
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-mt-2w"
        onclick={simulate}
        disabled={saving}
      >
        {saving ? "Simulation en cours…" : "Simuler la synchronisation"}
      </button>
      {#if errorMessage}<p class="fr-error-text">{errorMessage}</p>{/if}
      <DossierSpeciesSimulation
        {dossierId}
        groups={speciesGroups}
        onSimulated={(result) => (actions = result)}
      />
      {#if actions}
        <h3 class="fr-text--sm fr-mt-3w fr-mb-1w">Historique du dossier après simulation</h3>
        {#if actions.length === 0}
          <p class="fr-hint-text">Aucune entrée : la valeur était déjà celle-là.</p>
        {:else}
          <ul class="fr-mb-0">
            {#each actions as action (action.id)}
              <li>
                {describe(action)}
                <span class="fr-hint-text">
                  {formatDate(action.created_at)}
                  {action.author_petitionnaire ? "· par le pétitionnaire" : ""}
                </span>
              </li>
            {/each}
          </ul>
        {/if}
      {/if}
    {/if}
  </div>
</section>
