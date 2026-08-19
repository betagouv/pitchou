export type SelectOption<Value = string> = {
  value: Value;
  label: string;
  /** Secondary text shown under the label, in the list only. */
  hint?: string;
};

export type SelectGroup<Value = string> = {
  label: string;
  options: SelectOption<Value>[];
};

export type SelectEntry<Value = string> = SelectOption<Value> | SelectGroup<Value>;

export function isGroup<Value>(entry: SelectEntry<Value>): entry is SelectGroup<Value> {
  return Array.isArray((entry as SelectGroup<Value>).options);
}

/** Every option in display order — the order keyboard navigation follows. */
export function flattenOptions<Value>(entries: SelectEntry<Value>[]): SelectOption<Value>[] {
  return entries.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]));
}

/**
 * An option along with its position among all options, so the list can be
 * rendered group by group while keyboard navigation stays a flat walk.
 */
export type IndexedOption<Value = string> = {
  option: SelectOption<Value>;
  index: number;
};

export type RenderedGroup<Value = string> = {
  /** `null` for options sitting outside any group. */
  label: string | null;
  options: IndexedOption<Value>[];
};

/** Groups options for rendering, keeping loose options in their original spot. */
export function toRenderedGroups<Value>(entries: SelectEntry<Value>[]): RenderedGroup<Value>[] {
  const groups: RenderedGroup<Value>[] = [];
  let index = 0;

  for (const entry of entries) {
    if (isGroup(entry)) {
      groups.push({
        label: entry.label,
        options: entry.options.map((option) => ({ option, index: index++ })),
      });
      continue;
    }

    let looseGroup = groups.at(-1);
    if (looseGroup?.label !== null) {
      looseGroup = { label: null, options: [] };
      groups.push(looseGroup);
    }
    looseGroup.options.push({ option: entry, index: index++ });
  }

  return groups;
}

/**
 * The option to move to when typing `query`, starting the search after `from`
 * and wrapping around, the way a native `<select>` does.
 */
export function findByTypeahead<Value>(
  options: SelectOption<Value>[],
  query: string,
  from: number,
): number {
  const normalized = query.toLowerCase();

  for (let step = 1; step <= options.length; step++) {
    const index = (Math.max(from, 0) + step) % options.length;
    if (options[index].label.toLowerCase().startsWith(normalized)) return index;
  }

  // Repeating the same letter cycles through matches, but a longer query may
  // also match the option already reached — keep it rather than losing focus.
  return options[Math.max(from, 0)]?.label.toLowerCase().startsWith(normalized) ? from : -1;
}
