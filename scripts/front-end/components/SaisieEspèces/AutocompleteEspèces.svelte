<script>
	/** @import {EspèceProtégée} from '../../../types/especes' */

    import { normalizeNomEspèce, normalizeTexteEspèce } from '../../../commun/manipulationStrings'
    import { espèceLabel } from '../../../commun/outils-espèces.js'

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée[]} espèces
     * @property {EspèceProtégée | undefined} [espèceSélectionnée]
     * @property {function | undefined} [onChange]
     * @property {string} [id]
     */


    /**
     * il y a 1000 opportunités d'optimizations en temps
     * (notamment des memoization). Une autre fois
     */

	/** @type {Props} */

    let {
        espèces,
        onChange,
        id = '',
        espèceSélectionnée = $bindable(undefined)
    } = $props()

    //$inspect('espèceSélectionnée', espèceSélectionnée)

    let text = $derived(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : '')

    //$inspect('text', text)

    /** @type {number | null}*/
    let selectedOption = $state(null)

    let showListBox = $state(false)

    function onInputFocus() {
        showListBox = true
        selectedOption = null
    }

    function onInput() {
        showListBox = true
    }

    function onInputBlur() {
        if (selectedOption === null) {
            showListBox = false
        }
    }

    /**
     * @param {FocusEvent} e
     * @param {number} indexOption
     */
    function onOptionBlur(e, indexOption) {
        const focusInput = e.relatedTarget === input
        const focusOtherOption = selectedOption !== indexOption && selectedOption !== null

        if (!focusInput && !focusOtherOption) {
            showListBox = false
            selectedOption = null
        }
    }

    /**
     * @param {EspèceProtégée} espèce
     */
    function onOptionClick(espèce) {
        selectionnerEspèce(espèce)
    }

    /**
     * @param {MouseEvent} e
     */
    function onOptionMouseDown(e) {
        // Évite la perte du focus et la fermeture de liste d'option
        e.preventDefault()
    }

    /**
     * @param {number | null} elementToFocus
     */
    function focusElement(elementToFocus) {
        if (elementToFocus === null) {
            input.focus()
        } else {
            optionsRefs[elementToFocus].focus()
        }
    }

    /**
     * @param {KeyboardEvent} e
     */
    function onKeyDown(e) {
        switch (e.key) {
            case "ArrowUp":
                if (showListBox && selectedOption !== null) {
                    e.preventDefault()
                    selectedOption = selectedOption === 0 ? null : selectedOption - 1
                    focusElement(selectedOption)
                }
                break

            case "ArrowDown":
                if (showListBox && espècesPertinentes.length > 0 && selectedOption !== espècesPertinentes.length - 1) {
                    e.preventDefault()
                    selectedOption = selectedOption === null ? 0 : selectedOption + 1
                    focusElement(selectedOption)
                }
                break
            case "Escape":
                input.focus()
                showListBox = false
                break
            case "Enter":
                if (showListBox) {
                    e.preventDefault()
                    if (selectedOption !== null) {
                        selectionnerEspèce(espècesPertinentes[selectedOption])
                    }
                }
                break
            case "ArrowLeft":
            case "ArrowRight":
            case "End":
            case "Home":
                input.focus()
                break
            default:
                if (e.target !== input && e.key.length === 1) {
                    input.focus()
                }
                break
        }
    }

    let espècesPertinentes = $derived.by(() => {
        if(text.trim().length === 0)
            return []

        return espèces
            .filter(({nomsScientifiques, nomsVernaculaires}) => {
                const textParts = text.trim().split(' ').map(normalizeTexteEspèce).filter(x => x.length >= 1)

                return textParts.every((/** @type {string} */ part) => {
                    for(let nom of nomsScientifiques){
                        nom = normalizeNomEspèce(nom)
                        if(nom.includes(part)){
                            return true
                        }
                    }

                    for(let nom of nomsVernaculaires){
                        nom = normalizeNomEspèce(nom)
                        if(nom.includes(part)){
                            return true
                        }
                    }
                })
            })
            .slice(0, 12)
    })

    /**
     *
     * @param {EspèceProtégée} espèce
     */
    function selectionnerEspèce(espèce){
        if(onChange){
            onChange(espèce)
        }

        // Passage à undefined avant pour forcer le changement dans le cas ou la même espèce est selectionnée à nouveau
        espèceSélectionnée = undefined
        espèceSélectionnée = espèce
        input.focus()
    }

    export function focus() {
        input?.focus()
    }

    /**
     * @type {HTMLElement}
     */
    let input;

    /**
     * @type {HTMLElement[]}
     */
    let optionsRefs = $state([]);

</script>

<div class="autocomplete-container" title={text}>
    <input
        id="{ id }"
        class="fr-input"
        role="combobox"
        autocomplete="off"
        aria-expanded="{showListBox && espècesPertinentes.length > 0}"
        aria-controls="combobox-{ id }-option-list"
        aria-activedescendant="{ selectedOption === null ? '' : `combobox-${ id }-option-${ selectedOption }` }"
        aria-autocomplete="list"
        aria-describedby="{text.length > 0 ? '' : `combobox-${ id }-help`}"
        onfocus={onInputFocus}
        onblur={onInputBlur}
        onkeydown={onKeyDown}
        oninput={onInput}
        bind:this={input}
        bind:value={text}
    >

    <ul
        id="combobox-{ id }-option-list"
        aria-labelledby="{ id }"
        role="listbox"
        hidden={!(showListBox && espècesPertinentes.length > 0)}
    >
        {#each espècesPertinentes as espèce, indexOption}
            <li
                id="combobox-{ id }-option-{ indexOption }"
                role="option"
                aria-selected="{ indexOption === selectedOption }"
                aria-posinset="{ indexOption + 1 }"
                aria-setsize="{ espècesPertinentes.length }"
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
    </ul>

    <span id="combobox-{ id }-help" hidden>
        Utilisez les flèches « haut » et « bas » pour naviguer entres les suggestions et « entrer » pour sélectionner.
    </span>

</div>

<style lang="scss">
    .autocomplete-container{
        position: relative;

        ul {
            position: absolute;
            width: 100%;
            margin: 0;

            z-index: 1;
            background-color: var(--border-default-grey);
            padding-inline-start: 0;

            li{
                width: 100%;
                cursor: pointer;

                background-color: var(--background-contrast-grey);
                list-style-type: none;
                padding: 0.3rem;

                &[aria-selected="true"], &:hover {
                    background-color: var(--background-contrast-grey-active);
                }
            }
        }
    }


</style>
