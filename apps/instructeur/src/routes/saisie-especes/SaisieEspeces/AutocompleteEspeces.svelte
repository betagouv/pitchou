<script lang="ts">
  import type { EspeceProtegee } from "@pitchou/types/especes.d.ts";

  import { normalizeEspeceName, normalizeEspeceText } from "@pitchou/common/stringManipulation.ts";
  import { especeLabel } from "@pitchou/common/outils-especes.ts";

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
      relevantEspeces = filterEspeces(text);
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

  function onOptionClick(espece: EspeceProtegee) {
    selectEspece(espece);
  }

  function onOptionMouseDown(e: MouseEvent) {
    // Avoids losing focus and closing the option list
    e.preventDefault();
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

  function filterEspeces(text: string) {
    if (text.trim().length === 0) return [];

    return especes
      .filter(({ nomsScientifiques, nomsVernaculaires }) => {
        const textParts = text
          .trim()
          .split(" ")
          .map(normalizeEspeceText)
          .filter((x) => x.length >= 1);

        return textParts.every((part: string) => {
          for (let name of nomsScientifiques) {
            name = normalizeEspeceName(name);
            if (name.includes(part)) {
              return true;
            }
          }

          for (let name of nomsVernaculaires) {
            name = normalizeEspeceName(name);
            if (name.includes(part)) {
              return true;
            }
          }
        });
      })
      .slice(0, 12);
  }

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

<div class="autocomplete-container" title={text}>
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

  <ul id="combobox-{id}-option-list" aria-labelledby={id} role="listbox" hidden={!showListBox}>
    {#each relevantEspeces as espece, indexOption}
      <li
        role="option"
        aria-selected={indexOption === selectedOption}
        aria-posinset={indexOption + 1}
        aria-setsize={relevantEspeces.length}
        tabindex="-1"
        onblur={(e) => onOptionBlur(e, indexOption)}
        onclick={() => onOptionClick(espece)}
        onkeydown={onKeyDown}
        onmousedown={onOptionMouseDown}
        bind:this={optionsRefs[indexOption]}
      >
        {especeLabel(espece)}
      </li>
    {/each}

    {#if relevantEspeces.length === 0}
      <li role="option" aria-disabled="true" aria-selected="false">Pas de résultat</li>
    {/if}
  </ul>

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

<style lang="scss">
  .autocomplete-container {
    position: relative;

    ul {
      position: absolute;
      width: 100%;
      margin: 0;

      z-index: 1;
      background-color: var(--border-default-grey);
      padding-inline-start: 0;

      li {
        width: 100%;
        cursor: pointer;

        background-color: var(--background-contrast-grey);
        list-style-type: none;
        padding: 0.3rem;

        &[aria-selected="true"],
        &:hover {
          background-color: var(--background-contrast-grey-active);
        }
      }
    }
  }
</style>
