<script>
    /** @import { IndicateursAARRI } from '../../..//types/API_Pitchou.ts' */
	/** @import { ComponentProps } from 'svelte' */
    import Squelette from '../Squelette.svelte'
    import Loader from '../Loader.svelte'

    /** @typedef {Omit<ComponentProps<typeof Squelette>, 'children'> & {indicateursP: Promise<IndicateursAARRI>}} Props */
        
    /** @type {Props} */
    let { email, erreurs, résultatsSynchronisationDS88444, indicateursP } = $props();
</script>

<Squelette nav={true} title={'Suivi des indicateurs AARRI'} {email} {erreurs} {résultatsSynchronisationDS88444}>
    {#await indicateursP}
        <Loader></Loader>
    {:then indicateurs}
        <div class="fr-container fr-my-6w">
            <h1>Etat des lieux</h1>
            <section class="fr-mt-4w">
                <h2>Passage de "ne nous connait pas" à acquis</h2>
                {JSON.stringify(indicateurs)}
            </section>
        </div>
    {:catch error}
        <div class="fr-alert fr-alert--error fr-mb-3w">
            <h3 class="fr-alert__title">Une erreur est survenue lors du chargement des groupes d'instructeurs :</h3>
            <p>{error.message}</p>
        </div>
    {/await}
</Squelette>

