<script lang="ts">
  import FieldModifiable from "./FieldModifiable.svelte";
  import InheritanceCheckbox from "./InheritanceCheckbox.svelte";

  type Props = {
    label: string;
    /** Source the names are inherited from (currently always "TAXREF"). */
    source: string;
    inheritId: string;
    values: string[] | null;
    referenceValues: string[] | null;
    hasReference: boolean;
    saving: boolean;
    onSave: (value: string[] | null) => Promise<boolean>;
  };

  let { label, source, inheritId, values, referenceValues, hasReference, saving, onSave }: Props =
    $props();

  let editing = $state(false);
  let inherit = $state(false);
  let draft = $state<string[]>([]);

  function start() {
    inherit = hasReference && values === null;
    // Prefill with the effective value so unticking « hériter » keeps the inherited names.
    draft = [...(values ?? referenceValues ?? [])];
    editing = true;
  }

  function add() {
    draft = [...draft, ""];
  }

  function remove(index: number) {
    draft = draft.filter((_name, i) => i !== index);
  }

  async function save() {
    const cleaned = draft.map((name) => name.trim()).filter((name) => name.length >= 1);
    if (await onSave(inherit ? null : cleaned)) editing = false;
  }
</script>

<FieldModifiable
  {label}
  {editing}
  {saving}
  canAdd={editing && !inherit}
  onEdit={start}
  onSave={save}
  onCancel={() => (editing = false)}
  onAdd={add}
>
  {#snippet display()}
    {#if values !== null}
      <div class="field-value">{values.join(", ") || "(aucun)"}</div>
    {:else if referenceValues?.length}
      <div class="field-value hint">Hérité du {source} : {referenceValues.join(", ")}</div>
    {:else if hasReference}
      <div class="field-value hint">Hérité du {source}</div>
    {:else}
      <div class="field-value hint">Non renseignés</div>
    {/if}
  {/snippet}
  {#snippet edit()}
    {#if hasReference}
      <InheritanceCheckbox id={inheritId} {source} bind:checked={inherit} />
    {/if}
    <div class="name-list">
      {#each draft as _name, i (i)}
        <div class="name-row">
          <input
            class="fr-input"
            type="text"
            disabled={inherit}
            aria-label={`Nom ${i + 1}`}
            bind:value={draft[i]}
          />
          <button
            type="button"
            class="fr-btn fr-btn--sm fr-btn--tertiary-no-outline fr-icon-delete-line"
            title="Supprimer ce nom"
            aria-label="Supprimer ce nom"
            disabled={inherit}
            onclick={() => remove(i)}
          ></button>
        </div>
      {/each}
      {#if draft.length === 0}
        <p class="hint">Aucun nom. Utilisez « + » pour en ajouter un.</p>
      {/if}
    </div>
  {/snippet}
</FieldModifiable>

<style lang="scss">
  .name-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .name-row {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;

    .fr-input {
      flex: 1;
    }
  }
</style>
