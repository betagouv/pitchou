import { getContext, setContext } from "svelte";

const key = Symbol("dossier-read-only");

/**
 * Publishes the read-only mode to the whole dossier subtree, so the components
 * that offer a write action can hide it without the flag being drilled through
 * every intermediate component.
 *
 * Takes a getter rather than a value so the mode stays reactive.
 */
export function provideReadOnly(readOnly: () => boolean): void {
  setContext(key, readOnly);
}

/**
 * Read-only mode of the surrounding dossier. Call at component initialisation,
 * then read `.current` wherever reactivity is needed.
 *
 * Outside a dossier page — in a component test, typically — nothing provides
 * the mode and edition stays available.
 */
export function readOnlyMode(): { readonly current: boolean } {
  const readOnly = getContext<(() => boolean) | undefined>(key);
  return {
    get current() {
      return readOnly?.() ?? false;
    },
  };
}
