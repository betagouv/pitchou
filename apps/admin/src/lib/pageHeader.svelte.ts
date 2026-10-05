// Runtime overrides for the admin shell header, registered by pages.
//
// The header title normally comes from the static per-path map in
// `routes/Layout/nav.ts`; a page whose title depends on loaded data (e.g. the
// dossier name) registers it here. Pages with a primary action register it
// too: the header renders it as an icon button at its right edge ("+" unless
// the action provides its own icon).
//
// Register from a `$effect` and clear in its cleanup so the override never
// outlives the page:
//
//   $effect(() => {
//     pageHeader.setTitle(name);
//     return () => pageHeader.clearTitle();
//   });

export type HeaderAction = {
  label: string;
  /** DSFR icon class; defaults to the "+" add icon. */
  icon?: string;
  disabled?: boolean;
  onClick: () => void;
};

let title = $state<string | null>(null);
let action = $state<HeaderAction | null>(null);
let help = $state<HeaderAction | null>(null);
let downloads = $state<HeaderAction[]>([]);
let feedback = $state<{ message: string; kind: "success" | "saving" } | null>(null);
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;
let feedbackVersion = 0;

function clearFeedback() {
  clearTimeout(feedbackTimer);
  feedbackTimer = undefined;
  feedback = null;
  feedbackVersion++;
}

function showSaved(message = "Modifications enregistrées") {
  clearFeedback();
  feedback = { message, kind: "success" };
  feedbackTimer = setTimeout(clearFeedback, 3000);
}

export const pageHeader = {
  get help() {
    return help;
  },
  setHelp(value: HeaderAction) {
    help = value;
  },
  clearHelp() {
    help = null;
  },
  get downloads() {
    return downloads;
  },
  setDownloads(value: HeaderAction[]) {
    downloads = value;
  },
  clearDownloads() {
    downloads = [];
  },
  get feedback() {
    return feedback;
  },
  clearFeedback,
  showSaved,
  showSaving() {
    clearFeedback();
    feedback = { message: "Enregistrement…", kind: "saving" };
  },
  // Only confirm a successful mutation while its page and save attempt are still current.
  beginSave(message = "Modifications enregistrées") {
    clearFeedback();
    const version = feedbackVersion;
    return () => {
      if (version === feedbackVersion) showSaved(message);
    };
  },
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
