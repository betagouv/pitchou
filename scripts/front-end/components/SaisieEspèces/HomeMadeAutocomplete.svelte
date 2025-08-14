<script>
	/** @import {EspèceProtégée} from '../../../types/especes' */

    /**
     * faire un <input>
     * - [x] qui liste les trucs pertinents quand on écrit
     * - [x] mettre la vraie liste des espèces
     *  - [x] max 12 éléments affichés
     */

    /**
     * @typedef {Object} Props
     * @property {EspèceProtégée[]} espèces
     * @property {EspèceProtégée | undefined} [espèceSélectionnée]
     * @property {function | undefined} [onChange]
     */


    throw `PPP brancher les autres trucs que les oiseaux à ce composant`
    // et supprimer les imports et les composants intermédiaires

	/** @type {Props} */

    let {
        espèces,
        onChange,
        espèceSélectionnée = $bindable(undefined)
    } = $props()

    $inspect('espèceSélectionnée', espèceSélectionnée)

    let text = $state(espèceSélectionnée ? espèceLabel(espèceSélectionnée) : '')

    $inspect('text', text)

    let focus = $state(false);

    let onfocus = () => {focus = true}
    let onblur = () => {
        setTimeout(
            () => {focus = false}, 
            500
        )
    }

    let espècesPertinentes = $derived.by(() => {
        if(!focus)
            return []

        if(text.trim().length === 0)
            return []
        

        return espèces
            .filter(e => [...e.nomsScientifiques, ...e.nomsVernaculaires].join(' ').toLowerCase().includes(text.toLowerCase()))
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
     
        text = ''
        espèceSélectionnée = espèce
    }

    /**
     * 
     * @param {EspèceProtégée} espèce
     * @returns {string}
     */
    function espèceLabel(espèce){
        return `${[...espèce.nomsVernaculaires][0]} (${[...espèce.nomsScientifiques][0]})`
    }

    //$inspect('text', text)
    //$inspect('espècesPertinentes', espècesPertinentes)

</script>

<div class="autocomplete-container" title={text}>
    <input bind:value={text} type="search" {onfocus} {onblur} class="fr-input">

    {#if espècesPertinentes.length >= 1}
    <ol>
        {#each espècesPertinentes as espèce}
            <li onclick={() => selectionnerEspèce(espèce)}>{espèceLabel(espèce)}</li>
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
                padding: 0.3rem;
                margin-bottom: 2px;

                background-color: var(--background-contrast-grey);
                cursor: pointer;

                &::marker{
                    content: none;
                }
            }
        }
    }
   

</style>