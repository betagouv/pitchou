export function trapDialogFocus(event: KeyboardEvent & { currentTarget: HTMLDialogElement }) {
  if (event.key !== "Tab") return;
  const items = [
    ...event.currentTarget.querySelectorAll<HTMLElement>("button, a[href], iframe, [tabindex]"),
  ].filter(
    (item) =>
      item.tabIndex >= 0 && !item.hasAttribute("disabled") && item.getClientRects().length > 0,
  );
  const first = items[0],
    last = items.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
}
export function showMailDialog(dialog: HTMLDialogElement, trigger: () => HTMLElement | null) {
  dialog.showModal();
  return {
    destroy() {
      dialog.close();
      const element = trigger();
      if (element?.isConnected) element.focus({ preventScroll: true });
    },
  };
}
