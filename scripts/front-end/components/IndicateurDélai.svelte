<script>
    import { run } from 'svelte/legacy';

    import clsx from 'clsx'

    

    

    
    /**
     * @typedef {Object} Props
     * @property { 'info' | 'succès' | 'avertissement' | 'erreur' } [style]
     * @property { number } quantité
     * @property { string } alt
     */

    /** @type {Props} */
    let { style = 'info', quantité, alt } = $props();

    let quantitéAjustée = $derived(quantité)
    run(() => {
        if(quantitéAjustée < 0){
            quantitéAjustée = 0
        }
        else{
            if(quantitéAjustée > 5){
                quantitéAjustée = 5
            }
        }

        // arrondir à la demie-valeur la plus proche
        quantitéAjustée = Math.round(quantitéAjustée*2)/2
    });
    
    let baseClasses = $derived([
        'trait',
        style
    ])
    
    let traitsClasses = $derived([...Array(Math.ceil(quantitéAjustée))].map((_, i) => {
        if(quantitéAjustée - i >= 1){
            return baseClasses
        }
        else{
            return [
                ...baseClasses,
                'moitié'
            ]
        }
    }))

</script>

<div class="délai" title={alt}>
    {#each traitsClasses as classes}
        <span class={clsx(classes)}></span>
    {/each}
</div>


<style lang="scss">
    $largeur-trait: 1.5rem;

    .délai{
        height: 1rem;
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: flex-start;

        .trait{
            width: $largeur-trait;
            height: 50%;
            transform: translateY(50%);

            border: none;
            border-top: 2px solid var(--border-default-grey);
            margin-right: 0.2rem;

            &.moitié{
                width: calc($largeur-trait/2);
            }

            &.info{
                border-color: var(--border-plain-info)
            }
            &.succès{
                border-color: var(--border-plain-success)
            }
            &.avertissement{
                border-color: var(--border-plain-warning)
            }
            &.erreur{
                border-color: var(--border-plain-error)
            }



        }
    }
</style>
