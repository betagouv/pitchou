<script lang="ts">
  import { onMount, type Snippet } from "svelte";
  import Modal from "#lib/components/Modal.svelte";

  let {
    title,
    busy,
    onClose,
    initialFocus,
    children,
    footer,
  }: {
    title: string;
    busy: boolean;
    onClose: () => void;
    initialFocus: () => void;
    children: Snippet;
    footer: Snippet;
  } = $props();

  let dialog: HTMLDialogElement;

  onMount(() => {
    dialog.showModal();
    initialFocus();
    return () => dialog.close();
  });

  function close() {
    if (!busy) onClose();
  }
</script>

<dialog
  bind:this={dialog}
  class="m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-[var(--text-default-grey)] backdrop:bg-transparent"
  aria-label={title}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
>
  <Modal {title} onClose={close} {children} {footer} insideNativeDialog />
</dialog>
