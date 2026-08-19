<script lang="ts">
  import { untrack } from "svelte";
  import { isTimeOfDayKnown } from "@pitchou/common/formatDate.ts";
  import { simulateDossierSync, type SimulatedAction } from "$lib/actions/adminDossiers.ts";

  type Props = {
    dossierId: number;
    champs: { column: string; label: string }[];
    /** Dossiers created in Pitchou are never touched by the synchronization. */
    simulable: boolean;
  };
  let { dossierId, champs, simulable }: Props = $props();

  // The list comes from the server and never changes while the page is open.
  let champ = $state(untrack(() => champs[0]?.column ?? ""));
  let valeur = $state("");
  let saving = $state(false);
  let errorMessage = $state("");
  let actions: SimulatedAction[] | undefined = $state();

  function describe(action: SimulatedAction): string {
    const data = (action.data ?? {}) as Record<string, unknown>;
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

<fieldset class="fr-fieldset w-full" aria-label="Simulation d'une synchronisation">
  <legend class="fr-fieldset__legend fr-text--bold">
    Simuler une modification du pétitionnaire
  </legend>
  <div class="fr-fieldset__element">
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
          <select class="fr-select" id="simulation-champ" bind:value={champ}>
            {#each champs as option}<option value={option.column}>{option.label}</option>{/each}
          </select>
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
</fieldset>
