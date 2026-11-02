<script lang="ts">
  import { onMount, tick, type Snippet } from "svelte";
  import Modal from "#lib/components/Modal.svelte";

  let {
    title,
    onClose,
    children,
    footer,
  }: { title: string; onClose: () => void; children: Snippet; footer: Snippet } = $props();
  let container: HTMLDivElement;

  onMount(() => {
    const trigger = document.activeElement;
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  });

  $effect(() => {
    // Announce the new stage while keeping the editor subtree mounted.
    const stageTitle = title;
    void tick().then(() => {
      const heading = container?.querySelector("h2");
      if (heading?.isConnected && heading.textContent === stageTitle) {
        heading.tabIndex = -1;
        heading.focus();
      }
    });
  });

  function keepFocus(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = Array.from(
      container.querySelectorAll<HTMLElement>(
        "a[href], button, input, select, textarea, summary, [tabindex]",
      ),
    ).filter(
      (element) =>
        element.tabIndex >= 0 &&
        !element.matches(":disabled") &&
        element.getClientRects().length > 0,
    );
    const first = controls[0];
    const last = controls.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && !controls.includes(document.activeElement as HTMLElement)) {
      event.preventDefault();
      last.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
</script>

<svelte:window onkeydown={keepFocus} />

<div bind:this={container}>
  <Modal {title} {onClose} {footer} size="large">
    {@render children()}
  </Modal>
</div>
