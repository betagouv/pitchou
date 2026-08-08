<script lang="ts">
  type Props = {
    loading: boolean;
    loadFailed: boolean;
    saving: boolean;
    close: () => void;
    submit: () => void;
  };
  let { loading, loadFailed, saving, close, submit }: Props = $props();
</script>

<footer
  class="flex flex-wrap justify-end gap-4 border-t border-[color:var(--border-default-grey)] fr-p-3w"
>
  <button type="button" class="fr-btn fr-btn--secondary" disabled={saving} onclick={close}
    >Annuler</button
  >
  <button
    type="button"
    class="fr-btn"
    disabled={loading || loadFailed || saving}
    aria-busy={saving}
    onclick={submit}
  >
    {saving ? "Attribution en cours…" : "Attribuer le dossier"}
  </button>
</footer>
