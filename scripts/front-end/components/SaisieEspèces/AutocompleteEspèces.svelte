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

    $inspect('espèceSélectionnée', espèceSélectionnée)

    let text = $derived(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : '')

    $inspect('text', text)

    /** @type {number | null}*/
    let selectedOption = $state(null)

    /** @type {number | null}*/
    let focusedOption = $state(null)

    let showListBox = $state(false)

    function onInputFocus() {
        showListBox = true
        selectedOption = null
        focusedOption = null
    }

    function onInput() {
        showListBox = true
    }

    function onInputBlur() {
        if (focusedOption === null) {
            showListBox = false
        }
    }

    /**
     * @param {FocusEvent} e
     * @param {number} indexOption
     */
    function onOptionBlur(e, indexOption) {
        const focusInput = e.relatedTarget === input
        const focusOtherOption = focusedOption !== indexOption && focusedOption !== null

        if (!focusInput && !focusOtherOption) {
            showListBox = false
            focusedOption = null
            selectedOption = null
        }
    }

    /**
     *
     * @param {EspèceProtégée} espèce
     */
    function onOptionClick(espèce) {
        selectionnerEspèce(espèce)
    }

    /**
     * @param {number | null} focusedOption
     */
    function focusElement(focusedOption) {
        if (focusedOption === null) {
            input.focus()
        } else {
            optionsRefs[focusedOption].focus()
        }
    }

    /**
     * @param {KeyboardEvent} e
     */
    function onKeyDown(e) {
        switch (e.key) {
            case "ArrowUp":
                if (showListBox && selectedOption !== null) {
                    selectedOption = selectedOption === 0 ? null : selectedOption - 1
                    focusedOption = selectedOption
                    focusElement(focusedOption)
                }
                break

            case "ArrowDown":
                if (showListBox && espècesPertinentes.length > 0 && selectedOption !== espècesPertinentes.length - 1) {
                    selectedOption = selectedOption === null ? 0 : selectedOption + 1
                    focusedOption = selectedOption
                    focusElement(focusedOption)
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
                        input.focus()
                        showListBox = false
                    }
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

        espèceSélectionnée = espèce
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
        aria-expanded="{showListBox && text.length > 0}"
        aria-controls="combobox-suggestion-list-{ id }"
        aria-autocomplete="list"
        bind:this={input}
        bind:value={text}
        onfocus={onInputFocus}
        onblur={onInputBlur}
        onkeydown={onKeyDown}
        oninput={onInput}
    >

    <ul
        id="combobox-suggestion-list-{ id }"
        aria-labelledby="{ id }"
        role="listbox"
        hidden={!(showListBox && text.length > 0)}
    >
        {#each espècesPertinentes as espèce, indexOption}
            <li
                id="combobox-{ id }-suggestion-item-{ indexOption }"
                role="option"
                aria-selected="{ indexOption === selectedOption }"
                aria-posinset="{ indexOption + 1 }"
                aria-setsize="{ espècesPertinentes.length }"
                tabindex="-1"
                onblur={(e) => onOptionBlur(e, indexOption)}
                onclick={() => onOptionClick(espèce)}
                onkeydown={onKeyDown}
                bind:this={optionsRefs[indexOption]}
            >
                {espèceLabel(espèce)}
            </li>
        {/each}
    </ul>

</div>

<style lang="scss">
    .autocomplete-container{
        position: relative;

        ul {
            position: absolute;
            width: 300%;

            z-index: 1;
            background-color: var(--border-default-grey);
            padding-inline-start: 0;

            li{
                width: 100%;

                background-color: var(--background-contrast-grey);
                list-style-type: none;
                padding: 0.3rem;
            }
        }
    }


</style>
