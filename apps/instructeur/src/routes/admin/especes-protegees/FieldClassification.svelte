<script lang="ts">
  import { CLASSIFICATIONS } from "./adminModificationsList.ts";
  import FieldModifiable from "./FieldModifiable.svelte";
  import InheritanceCheckbox from "./InheritanceCheckbox.svelte";

  type Props = {
    value: string | null;
    referenceClassification: string | null;
    hasReference: boolean;
    saving: boolean;
    /** Returns true once the save succeeded (so the field can leave edit mode). */
    onSave: (value: string | null) => Promise<boolean>;
  };

  let { value, referenceClassification, hasReference, saving, onSave }: Props = $props();

  let editing = $state(false);
  let inherit = $state(false);
  let draft = $state<string>(CLASSIFICATIONS[0]);

  function start() {
    inherit = hasReference && value === null;
    draft = value ?? referenceClassification ?? CLASSIFICATIONS[0];
    editing = true;
  }

  async function save() {
    if (await onSave(inherit ? null : draft)) editing = false;
  }
</script>

<FieldModifiable
  label="Classification"
  {editing}
  {saving}
  onEdit={start}
  onSave={save}
  onCancel={() => (editing = false)}
>
  {#snippet display()}
    {#if value !== null}
      <div class="field-value">{value}</div>
    {:else if referenceClassification}
      <div class="field-value hint">Hérité du TAXREF : {referenceClassification}</div>
    {:else}
      <div class="field-value hint">Non renseignée</div>
    {/if}
  {/snippet}
  {#snippet edit()}
    {#if hasReference}
      <InheritanceCheckbox id="inherit-classification" source="TAXREF" bind:checked={inherit} />
    {/if}
    <select class="fr-select" disabled={inherit} bind:value={draft}>
      {#each CLASSIFICATIONS as classification}
        <option value={classification}>{classification}</option>
      {/each}
    </select>
  {/snippet}
</FieldModifiable>
