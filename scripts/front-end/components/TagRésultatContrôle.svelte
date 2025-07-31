<script>
    //@ts-check
  
    import clsx from 'clsx'

	/** @import { MouseEventHandler } from 'svelte/elements' */
    /** @import { RésultatContrôle } from '../../types/API_Pitchou.ts' */
	

    /** @type {RésultatContrôle | string} */
    export let résultatContrôle

    // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

    /** @type {'SM' | 'MD'} */
    export let taille = 'SM'

    /** @type {MouseEventHandler<HTMLButtonElement> | undefined} */
    export let onClick = undefined

    /** @type {boolean | undefined} */
    export let ariaPressed = undefined

    /** @type {string[]} */
    export let classes = []

    /** @type {Map<RésultatContrôle, string>} */
    const résultatToClass = new Map([
        ['Conforme', 'résultat--conforme'],
        ['Non conforme', 'résultat--non-conforme'],
        ['Non conforme (Pas d\'informations reçues)', 'résultat--non-conforme-pas-information'],
        ['En cours', 'résultat--en-cours'],
        ['Trop tard', 'résultat--trop-tard']
    ])

    /** @type {Map<typeof taille, string>} */
    const tailleToClass = new Map([
        ['SM', 'fr-tag--sm'],
        ['MD', 'fr-tag--md']
    ])

    $: allClasses = [
        'fr-tag',
        tailleToClass.get(taille),
        // @ts-ignore
        résultatToClass.get(résultatContrôle),
        ...classes
    ]


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
    <button class={clsx(allClasses)} aria-pressed={ariaPressed} on:click={onClickWithDSFROverride} type="button">{résultatContrôle}</button>
{:else}
    <p class={clsx(allClasses)}>{résultatContrôle}</p>
{/if}




<style lang="scss">
    $couleur-résultat-contrôle-conforme: var(--background-flat-success);
    $couleur-résultat-contrôle-non-conforme: var(--background-flat-error);
    $couleur-résultat-contrôle-autre: var(--background-flat-beige-gris-galet);

    p{
        white-space: nowrap;
    }

    p, button.fr-tag[aria-pressed="true"]{

        // DSFR override
        &, &:hover{
            background-image: none;
        }

        &.résultat--conforme{
            background-color: $couleur-résultat-contrôle-conforme;
            color: var(--text-inverted-success);

            &::after{
                color: $couleur-résultat-contrôle-conforme;
            }
        }
        &.résultat--non-conforme,
        &.résultat--non-conforme-pas-information{
            background-color: $couleur-résultat-contrôle-non-conforme;
            color: var(--text-inverted-error);
            
            &::after{
                color: $couleur-résultat-contrôle-non-conforme;
            }
        }
    }

    button.fr-tag[aria-pressed="false"]{
        /*&.phase--accompagnement-amont{
            color: $couleur-phase-accompagnement-amont;
            border: 1px solid $couleur-phase-accompagnement-amont;
        }
        &.phase--étude-recevabilité{
            color: $couleur-phase-étude-recevabilité;
            border: 1px solid $couleur-phase-étude-recevabilité;
        }
        &.phase--instruction{
            color: $couleur-phase-instruction;
            border: 1px solid $couleur-phase-instruction;
        }
        &.phase--contrôle{
            color: $couleur-phase-contrôle;
            border: 1px solid $couleur-phase-contrôle;
        }
        &.phase--classé-sans-suite{
            color: $couleur-phase-classé-sans-suite;
            border: 1px solid $couleur-phase-classé-sans-suite;
        }
        &.phase--obligations-terminées{
            color: $couleur-phase-obligations-terminées;
            border: 1px solid $couleur-phase-obligations-terminées;
        }*/
    }
</style>
