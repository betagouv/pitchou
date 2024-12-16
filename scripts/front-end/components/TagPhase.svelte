<script>
    //@ts-check
  
	/** @import { MouseEventHandler } from 'svelte/elements' */
    /** @import { DossierPhase } from '../../types/API_Pitchou.d.ts' */
	

    /** @type {DossierPhase} */
    export let phase

    // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

    /** @type {'SM' | 'MD'} */
    export let taille = 'MD'

    /** @type {MouseEventHandler<HTMLButtonElement> | undefined} */
    export let onClick = undefined

    /** @type {boolean | undefined} */
    export let ariaPressed = undefined

    /** @type {string[]} */
    export let classes = []

    /** @type {Map<DossierPhase, string>} */
    const phaseToClass = new Map([
        ['Accompagnement amont', 'phase--accompagnement-amont'],
        ['Vérification du dossier', 'phase--vérification-dossier'],
        ['Instruction', 'phase--instruction'],
        ['Contrôle', 'phase--contrôle'],
        ['Classé sans suite', 'phase--classé-sans-suite'],
        ['Obligations terminées', 'phase--obligations-terminées']
    ])

    /** @type {Map<typeof taille, string>} */
    const tailleToClass = new Map([
        ['SM', 'fr-tag--sm'],
        ['MD', 'fr-tag--md']
    ])

    $: allClasses = [
        'fr-tag',
        tailleToClass.get(taille),
        phaseToClass.get(phase),
        ...classes
    ].filter(x => !!x)


    /**
     * Le DSFR rajoute ses propres listeners pour gérer les aria-pressed, mais on n'en a pas besoin
     * alors, on désactive la propagation des évènements pour éviter des problèmes d'affichage
    */
    /** @type {MouseEventHandler<HTMLButtonElement>} */
    function onClickWithDSFROverride(e){
        if(onClick){
            e.stopImmediatePropagation()
            onClick(e)
        }
    }

</script>

{#if typeof onClick === 'function'}
    <button class={allClasses.join(' ')} aria-pressed={ariaPressed} on:click={onClickWithDSFROverride} type="button">{phase}</button>
{:else}
    <p class={allClasses.join(' ')}>{phase}</p>
{/if}




<style lang="scss">
    p{
        white-space: nowrap;
    }

    p, button.fr-tag[aria-pressed="true"]{

        // DSFR override
        &, &:hover{
            background-image: none;
        }

        &.phase--accompagnement-amont{
            background-color: var(--background-flat-yellow-moutarde);
            color: var(--text-inverted-yellow-moutarde);

            &::after{
                color: var(--background-flat-yellow-moutarde);
            }
        }
        &.phase--vérification-dossier{
            background-color: var(--background-flat-orange-terre-battue);
            color: var(--text-inverted-orange-terre-battue);
            
            &::after{
                color: var(--background-flat-orange-terre-battue);
            }
        }
        &.phase--instruction{
            background-color: var(--background-flat-blue-cumulus);
            color: var(--text-inverted-blue-cumulus);
            
            &::after{
                color: var(--background-flat-blue-cumulus);
            }
        }
        &.phase--contrôle{
            background-color: var(--background-flat-pink-tuile);
            color: var(--text-inverted-pink-tuile);
            
            &::after{
                color: var(--background-flat-pink-tuile);
            }
        }
        &.phase--classé-sans-suite{
            background-color: var(--background-flat-green-menthe);
            color: var(--text-inverted-green-menthe);
            
            &::after{
                color: var(--background-flat-green-menthe);
            }
        }
        &.phase--obligations-terminées{
            background-color: var(--background-flat-purple-glycine);
            color: var(--text-inverted-purple-glycine);
            
            &::after{
                color: var(--background-flat-purple-glycine);
            }
        }
    }

    button.fr-tag[aria-pressed="false"]{
        &.phase--accompagnement-amont{
            color: var(--background-flat-yellow-moutarde);
            border: 1px solid var(--background-flat-yellow-moutarde);
        }
        &.phase--vérification-dossier{
            color: var(--background-flat-orange-terre-battue);
            border: 1px solid var(--background-flat-orange-terre-battue);
        }
        &.phase--instruction{
            color: var(--background-flat-blue-cumulus);
            border: 1px solid var(--background-flat-blue-cumulus);
        }
        &.phase--contrôle{
            color: var(--background-flat-pink-tuile);
            border: 1px solid var(--background-flat-pink-tuile);
        }
        &.phase--classé-sans-suite{
            color: var(--background-flat-green-menthe);
            border: 1px solid var(--background-flat-green-menthe);
        }
        &.phase--obligations-terminées{
            color: var(--background-flat-purple-glycine);
            border: 1px solid var(--background-flat-purple-glycine);
        }
    }
</style>
