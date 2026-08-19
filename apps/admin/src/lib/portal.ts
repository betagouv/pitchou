/**
 * Svelte action: moves the element to `document.body`, so a fixed overlay
 * escapes any ancestor stacking context (e.g. a sticky toolbar with a z-index).
 */
export function portal(node: HTMLElement) {
  document.body.appendChild(node);
  return {
    destroy() {
      node.remove();
    },
  };
}
