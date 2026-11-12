<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import {
    commentOutcomes,
    type CommentChoice,
    type CommentGroup,
    type CommentOutcome,
  } from "@pitchou/types/onagreComments.ts";
  let {
    group,
    choices,
    busy,
    writable,
    values = $bindable(),
  }: {
    group: CommentGroup;
    choices: CommentChoice[];
    busy: boolean;
    writable: boolean;
    values: { outcome: CommentOutcome; selection: string; reason: string };
  } = $props();
  const allowed = $derived(
    choices.filter(
      (c) =>
        !group.payload.context.classifications?.length ||
        group.payload.context.classifications.includes(c.classification),
    ),
  );
  const targetLabels = {
    impact_type: "Type d’impact",
    impact_methode: "Méthode",
    impact_moyen_de_poursuite: "Moyen de poursuite",
  };
</script>

<fieldset disabled={busy || !writable} class="admin-stack">
  <legend class="fr-sr-only">Correspondance proposée</legend>
  <div class="onagre-field">
    <label for="comment-outcome">Décision</label>
    <input type="hidden" name="outcome" value={values.outcome} />
    <Select
      id="comment-outcome"
      disabled={busy || !writable}
      bind:value={values.outcome}
      options={Object.entries(commentOutcomes)
        .filter(([key]) => key !== "proposed" || group.category !== "unresolved_species")
        .map(([value, label]) => ({ value: value as CommentOutcome, label }))}
    />
  </div>
  {#if values.outcome === "proposed"}
    <div class="onagre-field">
      <label for="comment-target">Destination dans Pitchou</label>
      <Select
        id="comment-target"
        placeholder="Choisir une destination"
        disabled={busy || !writable}
        bind:value={values.selection}
        required
        options={Object.entries(targetLabels).map(([target, label]) => ({
          label,
          options: allowed
            .filter((c) => c.target === target)
            .map((choice) => ({
              value: [choice.target, choice.classification, choice.code].join("|"),
              label: choice.classification + " · " + choice.label + " (" + choice.code + ")",
            })),
        }))}
      />
    </div>
  {/if}
  <label
    >Justification, conditions et exceptions
    <textarea
      class="fr-input"
      name="reason"
      rows="5"
      maxlength="10000"
      required={values.outcome !== "pending"}
      bind:value={values.reason}></textarea>
  </label>
</fieldset>
