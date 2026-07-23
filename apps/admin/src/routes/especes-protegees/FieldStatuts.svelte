<script lang="ts">
  import { STATUTS } from "./adminModificationsList.ts";
  import FieldModifiable from "./FieldModifiable.svelte";
  import InheritanceCheckbox from "./InheritanceCheckbox.svelte";

  type Props = {
    values: string[] | null;
    referenceValues: string[] | null;
    hasReference: boolean;
    saving: boolean;
    onSave: (value: string[] | null) => Promise<boolean>;
  };

  let { values, referenceValues, hasReference, saving, onSave }: Props = $props();

  let editing = $state(false);
  let inherit = $state(false);
  let draft = $state<string[]>([]);

  function start() {
    inherit = hasReference && values === null;
    draft = [...(values ?? [])];
    editing = true;
  }

  function toggle(statut: string, checked: boolean) {
    draft = checked ? [...new Set([...draft, statut])] : draft.filter((s) => s !== statut);
  }

  async function save() {
    if (await onSave(inherit ? null : draft)) editing = false;
  }
</script>

<FieldModifiable
  label="Statuts de protection"
  {editing}
  {saving}
  onEdit={start}
  onSave={save}
  onCancel={() => (editing = false)}
>
  {#snippet display()}
    {#if values !== null}
      <div class="field-value">{values.join(", ") || "(aucun)"}</div>
    {:else if referenceValues?.length}
      <div class="field-value hint">Hérité du BDC-Statuts : {referenceValues.join(", ")}</div>
    {:else if hasReference}
      <div class="field-value hint">Hérité du BDC-Statuts</div>
    {:else}
      <div class="field-value hint">Non renseignés</div>
    {/if}
  {/snippet}
  {#snippet edit()}
    {#if hasReference}
      <InheritanceCheckbox id="inherit-statuts" source="BDC-Statuts" bind:checked={inherit} />
    {/if}
    <div class="statuts">
      {#each STATUTS as statut}
        <div class="fr-checkbox-group">
          <input
            id="statut-{statut}"
            type="checkbox"
            disabled={inherit}
            checked={draft.includes(statut)}
            onchange={(e) => toggle(statut, e.currentTarget.checked)}
          />
          <label class="fr-label" for="statut-{statut}">{statut}</label>
        </div>
      {/each}
    </div>
  {/snippet}
</FieldModifiable>

<style lang="scss">
  .statuts {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
  }
</style>
