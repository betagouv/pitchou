<script>
    //@ts-check
  
	/** @import { DossierPhase } from '../../types/API_Pitchou.d.ts' */

    /** @type {DossierPhase} */
    export let phase
    /** @type {Map<DossierPhase, string>} */
    const phaseToClass = new Map([
        ['Accompagnement amont', 'phase--accompagnement-amont'],
        ['Vérification du dossier', 'phase--vérification-dossier'],
        ['Instruction', 'phase--instruction'],
        ['Contrôle', 'phase--contrôle'],
        ['Classé sans suite', 'phase--classé-sans-suite'],
        ['Obligations terminées', 'phase--obligations-terminées']
    ])

    // https://www.systeme-de-design.gouv.fr/composants-et-modeles/composants/tag/

    /** @type {'SM' | 'MD'} */
    export let taille = 'MD'

    /** @type {Map<typeof taille, string>} */
    const tailleToClass = new Map([
        ['SM', 'fr-tag--sm'],
        ['MD', 'fr-tag--md']
    ])

    $: classes = [
        'fr-tag',
        tailleToClass.get(taille),
        phaseToClass.get(phase)
    ].filter(x => !!x)


</script>


<p class={classes.join(' ')}>{phase}</p>


<style lang="scss">
    p{
        white-space: nowrap;
    }

    .phase--accompagnement-amont{
        background-color: var(--background-flat-yellow-moutarde);
        color: var(--text-inverted-yellow-moutarde);
    }

    .phase--phase--vérification-dossier{
        background-color: var(--background-flat-orange-terre-battue);
        color: var(--text-inverted-orange-terre-battue);
    }

    .phase--instruction{
        background-color: var(--background-flat-blue-cumulus);
        color: var(--text-inverted-blue-cumulus);
    }

    .phase--contrôle{
        background-color: var(--background-flat-pink-tuile);
        color: var(--text-inverted-pink-tuile);
    }

    .phase--classé-sans-suite{
        background-color: var(--background-flat-green-menthe);
        color: var(--text-inverted-green-menthe);
    }

    .phase--obligations-terminées{
        background-color: var(--background-flat-purple-glycine);
        color: var(--text-inverted-purple-glycine);
    }
</style>
