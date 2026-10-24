<script lang="ts">
  import type { MappingStatus } from "@pitchou/types/onagre.ts";
  import TargetPicker from "../TargetPicker.svelte";
  import { statusLabels, statusHints, type Target } from "../mappings.ts";
  import type { DecisionDraft } from "./decision.svelte.ts";
  let {
    draft,
    targets,
    writable,
    proposal,
  }: { draft: DecisionDraft; targets: Target[]; writable: boolean; proposal: string } = $props();
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
  <TargetPicker {targets} bind:value={draft.target} disabled={!writable || draft.busy} />
  <div class="mapping-rule-label">
    <label for="mapping-rule"
      >{draft.status === "excluded" ? "Motif d'exclusion" : "Règle de reprise"}<span
        >{draft.status === "validated" || draft.status === "excluded"
          ? "Requis"
          : "Facultatif"}</span
      ></label
    >
    {#if proposal && !draft.rule}<button type="button" onclick={() => (draft.rule = proposal)}
        >Reprendre la proposition</button
      >{/if}
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
      : "Que conserver ? Comment le transformer ? Que faire si la valeur manque ?"}></textarea>
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
    placeholder="Points à trancher, exemples à vérifier, décision de la réunion…"></textarea>
</fieldset>
