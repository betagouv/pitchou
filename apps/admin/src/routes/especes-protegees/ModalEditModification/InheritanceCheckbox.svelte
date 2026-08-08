<script lang="ts">
  type Props = {
    id: string;
    /** Source the value is inherited from, e.g. "TAXREF" or "BDC-Statuts". */
    source: string;
    checked: boolean;
  };

  let { id, source, checked = $bindable(false) }: Props = $props();
</script>

<div class="fr-checkbox-group inherit">
  <input {id} type="checkbox" bind:checked />
  <label class="fr-label" for={id}>Hériter du {source}</label>
</div>
