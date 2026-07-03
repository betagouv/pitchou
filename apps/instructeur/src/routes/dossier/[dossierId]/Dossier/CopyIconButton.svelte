<script lang="ts">
  type Props = {
    textToCopy: string;
    label?: string;
  };

  let { textToCopy, label = "Copier" }: Props = $props();

  let copied = $state(false);
  let timeout: ReturnType<typeof setTimeout> | undefined;

  function onClick() {
    navigator.clipboard
      .writeText(textToCopy)
      .then(() => {
        copied = true;
        clearTimeout(timeout);
        timeout = setTimeout(() => (copied = false), 2000);
      })
      .catch((error) => {
        console.error("Une erreur s'est produite lors de la copie : ", error);
      });
  }
</script>

<button
  type="button"
  class="copy-button fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left {copied
    ? 'fr-icon-check-line'
    : 'fr-icon-clipboard-line'}"
  onclick={onClick}
>
  {copied ? "Copié !" : label}
</button>

<style lang="scss">
  .copy-button {
    padding: 0.25rem 0;
  }
</style>
