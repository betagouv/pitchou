// Runtime overrides for the admin shell header, registered by pages.
//
// The header title normally comes from the static per-path map in
// `routes/Layout/nav.ts`; a page whose title depends on loaded data (e.g. the
// dossier name) registers it here. Pages with a primary "add" action register
// it too: the header renders it as a "+" button at its right edge.
//
// Register from a `$effect` and clear in its cleanup so the override never
// outlives the page:
//
//   $effect(() => {
//     pageHeader.setTitle(name);
//     return () => pageHeader.clearTitle();
//   });

export type HeaderAction = { label: string; onClick: () => void };

let title = $state<string | null>(null);
let action = $state<HeaderAction | null>(null);

export const pageHeader = {
  get title(): string | null {
    return title;
  },
  get action(): HeaderAction | null {
    return action;
  },
  setTitle(value: string) {
    title = value;
  },
  clearTitle() {
    title = null;
  },
  setAction(value: HeaderAction) {
    action = value;
  },
  clearAction() {
    action = null;
  },
};
