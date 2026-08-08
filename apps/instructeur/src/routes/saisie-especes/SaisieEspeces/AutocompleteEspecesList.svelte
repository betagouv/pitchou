<script lang="ts">
  import { especeLabel } from "@pitchou/common/especesUtils.ts";
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";
  type Props = {
    id: string;
    especes: EspeceProtegee[];
    shown: boolean;
    selectedOption: number | null;
    optionsRefs: HTMLElement[];
    onBlur: (event: FocusEvent, index: number) => void;
    onSelect: (espece: EspeceProtegee) => void;
    onKeyDown: (event: KeyboardEvent) => void;
  };
  let {
    id,
    especes,
    shown,
    selectedOption,
    optionsRefs = $bindable(),
    onBlur,
    onSelect,
    onKeyDown,
  }: Props = $props();
</script>

<ul
  id="combobox-{id}-option-list"
  class="absolute w-full m-0 z-[1] bg-[var(--border-default-grey)] ps-0"
  aria-labelledby={id}
  role="listbox"
  hidden={!shown}
>
  {#each especes as espece, index}
    <li
      class="w-full cursor-pointer bg-[var(--background-contrast-grey)] list-none [padding:0.3rem] hover:bg-[var(--background-contrast-grey-active)] [&[aria-selected=true]]:bg-[var(--background-contrast-grey-active)]"
      role="option"
      aria-selected={index === selectedOption}
      aria-posinset={index + 1}
      aria-setsize={especes.length}
      tabindex="-1"
      onblur={(event) => onBlur(event, index)}
      onclick={() => onSelect(espece)}
      onkeydown={onKeyDown}
      onmousedown={(event) => event.preventDefault()}
      bind:this={optionsRefs[index]}
    >
      {especeLabel(espece)}
    </li>
  {/each}
  {#if especes.length === 0}
    <li
      class="w-full cursor-pointer bg-[var(--background-contrast-grey)] list-none [padding:0.3rem]"
      role="option"
      aria-disabled="true"
      aria-selected="false"
    >
      Pas de résultat
    </li>
  {/if}
</ul>
