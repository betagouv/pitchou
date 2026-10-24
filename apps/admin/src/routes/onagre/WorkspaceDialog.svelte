<script lang="ts">
  import type { Snippet } from "svelte";
  import Modal from "#lib/components/Modal.svelte";
  let {
    title,
    onClose,
    children,
    busy = false,
    triggerSelector,
    size = "large",
    footer,
  }: {
    title: string;
    onClose: () => void | boolean | Promise<void>;
    children: Snippet;
    busy?: boolean;
    triggerSelector?: string;
    size?: "large" | "xlarge";
    footer?: Snippet;
  } = $props();
  let closing = false;
  function close() {
    if (busy || closing) return;
    closing = onClose() !== false;
  }
  function open(dialog: HTMLDialogElement) {
    const trigger = triggerSelector
      ? document.querySelector<HTMLElement>(triggerSelector)
      : (document.activeElement as HTMLElement);
    dialog.showModal();
    return {
      destroy() {
        dialog.close();
        if (trigger?.isConnected) trigger.focus({ preventScroll: true });
      },
    };
  }
</script>

<dialog
  class="workspace-dialog"
  aria-label={title}
  use:open
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
>
  <Modal {title} onClose={close} {size} {footer} insideNativeDialog>{@render children()}</Modal>
</dialog>

<style>
  .workspace-dialog {
    max-width: none;
    max-height: none;
    width: 100%;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--text-default-grey);
  }
  .workspace-dialog::backdrop {
    background: transparent;
  }
</style>
