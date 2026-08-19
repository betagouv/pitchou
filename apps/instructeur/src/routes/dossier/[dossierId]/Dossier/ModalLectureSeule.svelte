<script lang="ts">
  import { onMount } from "svelte";

  type Props = {
    onClose: () => void;
  };

  let { onClose }: Props = $props();

  let dialogElement: HTMLDialogElement | undefined = $state();

  onMount(() => {
    dialogElement?.showModal();
  });
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<dialog
  bind:this={dialogElement}
  class="w-[min(32rem,calc(100vw-2rem))] border-0 fr-p-0 shadow-[var(--overlap-shadow,0_2px_12px_rgba(0,0,0,0.2))] backdrop:bg-[rgba(22,22,22,0.64)]"
  style="margin: auto;"
  aria-labelledby="lecture-seule-title"
  onclose={onClose}
  onclick={(event) => {
    if (event.target === dialogElement) dialogElement?.close();
  }}
>
  <div class="flex flex-col gap-4 bg-[var(--background-default-grey)] fr-p-3w">
    <header class="flex items-start justify-between gap-4">
      <h1 id="lecture-seule-title" class="fr-text--lg fr-mb-0">Voir le dossier en lecture seule</h1>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
        onclick={() => dialogElement?.close()}
      >
        Fermer
      </button>
    </header>
    <p class="fr-mb-0">
      Cette fonctionnalité n'est pas encore disponible. Elle permettra de partager une version en
      lecture seule du dossier.
    </p>
    <button type="button" class="fr-btn self-end" onclick={() => dialogElement?.close()}>
      J'ai compris
    </button>
  </div>
</dialog>
