<script lang="ts">
  import type { MappingStatus } from "@pitchou/types/onagre.ts";
  import TargetPicker from "../TargetPicker.svelte";
  import { statusLabels, statusHints, type Target } from "../mappings.ts";
  import type { DecisionDraft } from "./decision.svelte.ts";
  let { draft, targets, writable }: { draft: DecisionDraft; targets: Target[]; writable: boolean } =
    $props();
</script>

<fieldset disabled={!writable || draft.busy} class="mapping-decision-fields">
  <legend>Décision pour Pitchou</legend>
  <input type="hidden" name="status" value={draft.status} />
  <div class="mapping-decision-status" role="group" aria-label="Avancement de la décision">
    {#each Object.entries(statusLabels) as [value, label]}<button
        type="button"
        data-status={value}
        aria-pressed={draft.status === value}
        onclick={() => (draft.status = value as MappingStatus)}>{label}</button
      >{/each}
  </div>
  <p class="mapping-status-hint">{statusHints[draft.status]}</p>
  <p class="onagre-context">
    Décrivez ici uniquement cette correspondance. Les <a href="?tab=regles">règles communes</a> regroupent
    les choix partagés.
  </p>
  <TargetPicker {targets} bind:value={draft.target} disabled={!writable || draft.busy} />
  <div class="mapping-rule-label">
    <label for="mapping-rule"
      >{draft.status === "excluded" ? "Motif d'exclusion" : "Règle de reprise"}<span
        >{draft.status === "validated" || draft.status === "excluded"
          ? "Requis"
          : "Facultatif"}</span
      ></label
    >
  </div>
  <textarea
    id="mapping-rule"
    class="fr-input"
    name="rule"
    rows="5"
    maxlength="20000"
    bind:value={draft.rule}
    placeholder={draft.status === "excluded"
      ? "Pourquoi ne pas reprendre cette information ?"
      : "Transformation propre à ce champ ou à cette valeur Onagre."}></textarea>
  <label for="mapping-notes"
    >Notes et questions <span class="onagre-context">Facultatif</span></label
  >
  <textarea
    id="mapping-notes"
    class="fr-input"
    name="notes"
    rows="3"
    maxlength="20000"
    bind:value={draft.notes}
    placeholder="Une question à trancher pour cette correspondance ? Sinon, laissez vide."
  ></textarea>
</fieldset>
