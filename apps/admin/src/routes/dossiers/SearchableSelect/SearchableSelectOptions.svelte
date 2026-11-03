<script lang="ts">
  import type { SearchableOption } from "./options.ts";

  type Props = {
    id: string;
    labelledBy: string;
    options: SearchableOption[];
    value: string;
    activeIndex: number;
    onActivate: (index: number) => void;
    onSelect: (option: SearchableOption) => void;
  };

  let { id, labelledBy, options, value, activeIndex, onActivate, onSelect }: Props = $props();
  let optionElements: HTMLElement[] = $state([]);

  $effect(() => {
    optionElements[activeIndex]?.scrollIntoView({ block: "nearest" });
  });
</script>

<ul
  class="list-none m-0 min-h-0 flex-1 p-0 overflow-y-auto overscroll-contain"
  id={`${id}-options`}
  role="listbox"
  aria-labelledby={labelledBy}
>
  {#each options as option, index (option.value)}
    <li
      class={`fr-px-3w fr-py-2w cursor-pointer hover:bg-[var(--background-alt-grey-hover)] ${index === activeIndex ? "bg-[var(--background-alt-grey-active)]" : ""}`}
      id={`${id}-option-${index}`}
      role="option"
      tabindex="-1"
      aria-selected={option.value === value}
      bind:this={optionElements[index]}
      onmouseenter={() => onActivate(index)}
      onmousedown={(event) => event.preventDefault()}
      onclick={() => onSelect(option)}
      onkeydown={(event) => event.key === "Enter" && onSelect(option)}
    >
      {option.label}
    </li>
  {:else}
    <li
      class="fr-px-3w fr-py-2w text-[color:var(--text-mention-grey)]"
      role="option"
      aria-disabled="true"
      aria-selected="false"
    >
      Aucun résultat
    </li>
  {/each}
</ul>
