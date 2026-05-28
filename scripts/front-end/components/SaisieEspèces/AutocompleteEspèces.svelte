<script lang="ts">
  import type { EspèceProtégée } from "../../../types/especes";

  import { normalizeNomEspèce, normalizeTexteEspèce } from "../../../commun/manipulationStrings";
  import { espèceLabel } from "../../../commun/outils-espèces.js";

  type Props = {
    espèces: EspèceProtégée[];
    espèceSélectionnée?: EspèceProtégée | undefined;
    onChange?: ((espèce: EspèceProtégée) => void) | undefined;
    id?: string;
  };

  /**
   * Ressources utilisées / inspirations:
   * - https://a11y-guidelines.orange.com/fr/articles/recommandations-autocompletion/
   * - https://alphagov.github.io/accessible-autocomplete/examples/
   * - https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-autocomplete-list/
   */

  let { espèces, onChange, id = "", espèceSélectionnée = $bindable(undefined) }: Props = $props();

  let text = $state(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : "");
  let statusMessage = $state("");

  let selectedOption: number | null = $state(null);

  let showListBox = $state(false);

  function onInputFocus() {
    showListBox = text.length > 0 && espèceSélectionnée === undefined;
    selectedOption = null;
  }

  function onInput() {
    showListBox = true;
    espèceSélectionnée = undefined;

    if (text.length === 0) {
      showListBox = false;
      espècesPertinentes = [];
    } else {
      espècesPertinentes = filtrerEspeces(text);
      if (espècesPertinentes.length === 0) {
        messageLive("Pas de résultat");
      } else {
        messageLive(`${espècesPertinentes.length} résultats disponibles`);
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

  function onOptionClick(espèce: EspèceProtégée) {
    selectionnerEspèce(espèce);
  }

  function onOptionMouseDown(e: MouseEvent) {
    // Évite la perte du focus et la fermeture de liste d'option
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
          espècesPertinentes.length > 0 &&
          selectedOption !== espècesPertinentes.length - 1
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
            selectionnerEspèce(espècesPertinentes[selectedOption]);
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

  let espècesPertinentes: EspèceProtégée[] = $state([]);

  function filtrerEspeces(text: string) {
    if (text.trim().length === 0) return [];

    return espèces
      .filter(({ nomsScientifiques, nomsVernaculaires }) => {
        const textParts = text
          .trim()
          .split(" ")
          .map(normalizeTexteEspèce)
          .filter((x) => x.length >= 1);

        return textParts.every((part: string) => {
          for (let nom of nomsScientifiques) {
            nom = normalizeNomEspèce(nom);
            if (nom.includes(part)) {
              return true;
            }
          }

          for (let nom of nomsVernaculaires) {
            nom = normalizeNomEspèce(nom);
            if (nom.includes(part)) {
              return true;
            }
          }
        });
      })
      .slice(0, 12);
  }

  function messageLive(text: string) {
    statusMessage = text;
    setTimeout(() => {
      statusMessage = "";
    }, 400);
  }

  function selectionnerEspèce(espèce: EspèceProtégée) {
    if (onChange) {
      onChange(espèce);
    }

    espèceSélectionnée = espèce;
    text = espèceLabel(espèceSélectionnée);
    espècesPertinentes = [];
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
    aria-expanded={showListBox && espècesPertinentes.length > 0}
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
    {#each espècesPertinentes as espèce, indexOption}
      <li
        role="option"
        aria-selected={indexOption === selectedOption}
        aria-posinset={indexOption + 1}
        aria-setsize={espècesPertinentes.length}
        tabindex="-1"
        onblur={(e) => onOptionBlur(e, indexOption)}
        onclick={() => onOptionClick(espèce)}
        onkeydown={onKeyDown}
        onmousedown={onOptionMouseDown}
        bind:this={optionsRefs[indexOption]}
      >
        {espèceLabel(espèce)}
      </li>
    {/each}

    {#if espècesPertinentes.length === 0}
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
