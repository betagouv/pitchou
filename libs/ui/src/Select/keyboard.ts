/** What a key press asks the combobox to do. */
export type SelectCommand =
  | { action: "open" }
  | { action: "close"; keepEvent?: true }
  | { action: "move"; index: number }
  | { action: "commit" }
  | { action: "type"; key: string };

type ListState = {
  open: boolean;
  /** Position among all options of the option the keyboard sits on. */
  activeIndex: number;
  optionCount: number;
};

/**
 * Maps a key press on the trigger to a command, following the native
 * `<select>` behaviour. `null` when the key is none of the combobox's business
 * and the browser should keep it; a command otherwise, whose event the caller
 * cancels unless `keepEvent` says the browser still needs it (Tab out).
 */
export function commandForKey(event: KeyboardEvent, state: ListState): SelectCommand | null {
  const { open, activeIndex, optionCount } = state;

  if (event.key === "Tab") return open ? { action: "close", keepEvent: true } : null;
  if (event.key === "Escape") return open ? { action: "close" } : null;

  if (!open) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return { action: "open" };
  } else {
    switch (event.key) {
      case "ArrowDown":
        return { action: "move", index: activeIndex + 1 };
      case "ArrowUp":
        return { action: "move", index: activeIndex - 1 };
      case "Home":
        return { action: "move", index: 0 };
      case "End":
        return { action: "move", index: optionCount - 1 };
      case "Enter":
      case " ":
        return { action: "commit" };
    }
  }

  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    return { action: "type", key: event.key };
  }

  return null;
}

/** How long a typeahead query survives without a new key press. */
const TYPEAHEAD_RESET = 700;

/**
 * Accumulates the letters typed in a row: typing "ma" looks for « Marseille »
 * rather than for an option starting with "a". The query resets once typing
 * stops.
 */
export function createTypeahead(): { push: (key: string) => string } {
  let query = "";
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return {
    push(key: string): string {
      clearTimeout(timeout);
      query += key;
      timeout = setTimeout(() => (query = ""), TYPEAHEAD_RESET);
      return query;
    },
  };
}
