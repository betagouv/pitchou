<script lang="ts">
  import FieldModifiable from "./FieldModifiable.svelte";
  import YesNoToggle from "./YesNoToggle.svelte";

  type Props = {
    label: string;
    /** Label shown next to the Oui/Non toggle. */
    toggleLabel: string;
    value: boolean;
    saving: boolean;
    onSave: (value: boolean) => Promise<boolean>;
  };

  let { label, toggleLabel, value, saving, onSave }: Props = $props();

  let editing = $state(false);
  let draft = $state(false);

  function start() {
    draft = value;
    editing = true;
  }

  async function save() {
    if (await onSave(draft)) editing = false;
  }
</script>

<FieldModifiable
  {label}
  {editing}
  {saving}
  onEdit={start}
  onSave={save}
  onCancel={() => (editing = false)}
>
  {#snippet display()}
    <div class="field-value">{value ? "Oui" : "Non"}</div>
  {/snippet}
  {#snippet edit()}
    <YesNoToggle bind:value={draft} label={toggleLabel} />
  {/snippet}
</FieldModifiable>
