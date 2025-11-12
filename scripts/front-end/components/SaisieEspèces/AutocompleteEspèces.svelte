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
        id,
        espèceSélectionnée = $bindable(undefined)
    } = $props()

    $inspect('espèceSélectionnée', espèceSélectionnée)

    let text = $derived(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : '')

    $inspect('text', text)

    let openChoices = $state(false);

    /** @type {ReturnType<setTimeout> | undefined} */
    let timeout;

    let onfocus = () => {
        clearTimeout(timeout)
        openChoices = true
    }

    let onblur = () => {
        timeout = setTimeout(
            () => {openChoices = false},
            400
        )
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

</script>

<div class="autocomplete-container" title={text}>
    <input bind:this={input} bind:value={text} {onfocus} {onblur} id="{id ? id : ''}" class="fr-input">

    {#if openChoices && espècesPertinentes.length >= 1}
    <ol>
        {#each espècesPertinentes as espèce}
            <li><button type="button" onclick={() => selectionnerEspèce(espèce)} {onfocus} {onblur}>
                {espèceLabel(espèce)}
            </button></li>
        {/each}
    </ol>
    {/if}
</div>

<style lang="scss">
    .autocomplete-container{
        position: relative;

        ol{
            position: absolute;
            width: 300%;

            z-index: 1;

            background-color: var(--border-default-grey);

            padding-inline-start: 0;

            li{
                width: 100%;

                background-color: var(--background-contrast-grey);

                &::marker{
                    content: none;
                }

                button{
                    width: 100%;
                    height: 100%;
                    padding: 0.3rem;

                    text-align: left;
                }
            }
        }
    }


</style>
