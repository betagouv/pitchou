<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

  import { especeLabel } from "@pitchou/common/especesUtils.ts";
  import AutocompleteEspecesList from "./AutocompleteEspecesList.svelte";
  import { filterEspecesByText } from "./filterEspeces.ts";

  type Props = {
    espèces: EspeceProtegee[];
    espèceSélectionnée?: EspeceProtegee | undefined;
    onChange?: ((espece: EspeceProtegee) => void) | undefined;
    id?: string;
  };

  /**
   * Resources used / inspirations:
   * - https://a11y-guidelines.orange.com/fr/articles/recommandations-autocompletion/
   * - https://alphagov.github.io/accessible-autocomplete/examples/
   * - https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
   */

  let {
    espèces: especes,
    onChange,
    id = "",
    espèceSélectionnée: selectedEspece = $bindable(undefined),
  }: Props = $props();

  let text = $state(selectedEspece ? especeLabel(selectedEspece) : "");
  let statusMessage = $state("");

  let selectedOption: number | null = $state(null);

  let showListBox = $state(false);

  function onInputFocus() {
    showListBox = text.length > 0 && selectedEspece === undefined;
    selectedOption = null;
  }

  function onInput() {
    showListBox = true;
    selectedEspece = undefined;

    if (text.length === 0) {
      showListBox = false;
      relevantEspeces = [];
    } else {
      relevantEspeces = filterEspecesByText(especes, text);
      if (relevantEspeces.length === 0) {
        liveMessage("Pas de résultat");
      } else {
        liveMessage(`${relevantEspeces.length} résultats disponibles`);
      }
    }
  }

  function onInputBlur() {
    if (selectedOption === null) {
      showListBox = false;
    }
  }

  function onOptionBlur(e: FocusEvent, indexOption: number) {
    const focusInput = e.relatedTarget === input;
    const focusOtherOption = selectedOption !== indexOption && selectedOption !== null;

    if (!focusInput && !focusOtherOption) {
      showListBox = false;
      selectedOption = null;
    }
  }

  function focusElement(elementToFocus: number | null) {
    if (elementToFocus === null) {
      input.focus();
    } else {
      optionsRefs[elementToFocus].focus();
    }
  }

  function onKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowUp":
        if (showListBox && selectedOption !== null) {
          e.preventDefault();
          selectedOption = selectedOption === 0 ? null : selectedOption - 1;
          focusElement(selectedOption);
        }
        break;

      case "ArrowDown":
        if (
          showListBox &&
          relevantEspeces.length > 0 &&
          selectedOption !== relevantEspeces.length - 1
        ) {
          e.preventDefault();
          selectedOption = selectedOption === null ? 0 : selectedOption + 1;
          focusElement(selectedOption);
        }
        break;
      case "Escape":
        input.focus();
        showListBox = false;
        break;
      case "Enter":
        if (showListBox) {
          e.preventDefault();
          if (selectedOption !== null) {
            selectEspece(relevantEspeces[selectedOption]);
          }
        }
        break;
      case "ArrowLeft":
      case "ArrowRight":
      case "End":
      case "Home":
        input.focus();
        break;
      default:
        if (e.target !== input && e.key.length === 1) {
          input.focus();
        }
        break;
    }
  }

  let relevantEspeces: EspeceProtegee[] = $state([]);

  function liveMessage(text: string) {
    statusMessage = text;
    setTimeout(() => {
      statusMessage = "";
    }, 400);
  }

  function selectEspece(espece: EspeceProtegee) {
    if (onChange) {
      onChange(espece);
    }

    selectedEspece = espece;
    text = especeLabel(selectedEspece);
    relevantEspeces = [];
    input.focus();
    showListBox = false;
  }

  export function focus() {
    input?.focus();
  }

  let input: HTMLElement;

  let optionsRefs: HTMLElement[] = $state([]);
</script>

<div class="relative" title={text}>
  <input
    {id}
    class="fr-input"
    role="combobox"
    autocomplete="off"
    aria-expanded={showListBox && relevantEspeces.length > 0}
    aria-controls="combobox-{id}-option-list"
    aria-autocomplete="list"
    aria-describedby={text.length > 0 ? "" : `combobox-${id}-help`}
    onfocus={onInputFocus}
    onblur={onInputBlur}
    onkeydown={onKeyDown}
    oninput={onInput}
    bind:this={input}
    bind:value={text}
  />

  <AutocompleteEspecesList
    {id}
    especes={relevantEspeces}
    shown={showListBox}
    {selectedOption}
    bind:optionsRefs
    onBlur={onOptionBlur}
    onSelect={selectEspece}
    {onKeyDown}
  />

  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {#if statusMessage}
      {statusMessage}
    {/if}
  </div>

  <span id="combobox-{id}-help" hidden>
    Utilisez les flèches « haut » et « bas » pour naviguer entres les suggestions et « entrer » pour
    sélectionner.
  </span>
</div>
