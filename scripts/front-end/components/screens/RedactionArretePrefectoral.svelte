<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import NomEspèce from '../NomEspèce.svelte'
    import Loader from '../Loader.svelte'
    import EnteteDossier from '../Dossier/EnteteDossier.svelte'
    
    import { etresVivantsAtteintsCompareEspèce } from '../../espèceFieldset';

    /** @import {DossierComplet} from '../../../types/API_Pitchou.ts' */
    /** @import { DescriptionMenacesEspèces } from '../../../types/especes.d.ts' **/

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email = undefined

    /** @type {Promise<DescriptionMenacesEspèces | undefined>} */
    export let espècesImpactées

    $: espècesImpactéesUniquesTriées = espècesImpactées.then(espècesImpactées => {
        if(espècesImpactées){
            return Object.fromEntries(
                Object.entries(espècesImpactées)
                    .map(([classif, espècesImpactées]) => 
                        [
                            classif, 
                            [...new Set(
                                espècesImpactées
                                    .toSorted(etresVivantsAtteintsCompareEspèce)
                                    // @ts-ignore
                                    .map(({espèce}) => espèce)
                            )]
                        ]
                    )
            )
        }
    })

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <EnteteDossier {dossier}></EnteteDossier>
            
            <h2 class="fr-mb-8w">Aide à la Rédaction arrêté préfectoral</h2>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2>Liste des espèces protégées</h2>

                    {#await espècesImpactéesUniquesTriées}
                        <Loader></Loader>
                    {:then espècesImpactéesUniquesTriées} 
                        {#if espècesImpactéesUniquesTriées}
                            {#each Object.keys(espècesImpactéesUniquesTriées) as classif}
                                {#if espècesImpactéesUniquesTriées[classif].length >= 1}
                                    <section class="liste-especes">
                                        <h3>Liste des {classif}</h3>
                                        {#each espècesImpactéesUniquesTriées[classif] as espèce, index (espèce) }
                                            {#if index !== 0 },&nbsp;{/if}<NomEspèce espèce={espèce}/>
                                        {/each}
                                    </section>
                                {/if}
                            {/each}
                        {/if}
                    {:catch erreur}
                        <div class="fr-alert fr-alert--error fr-mb-3w">
                            {#if erreur.name === 'HTTPError'}
                                Erreur de réception du fichier. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
                            {:else if erreur.name === 'MediaTypeError'}
                                Le fichier d'espèces impactées dans le dossier n'est pas d'un type qui permet de récupérer la liste des espèces.
                                Un fichier .ods est attendu. Le fichier dans le dossier est le type <code>{erreur.obtenu}</code>.
                                Vous pouvez demander au pétitionnaire de fournir le fichier dans le bon format à la place du fichier actuel.
                            {:else}
                                Une erreur est survenue. Veuillez réessayer en rafraichissant la page maintenant ou plus tard.
                            {/if}
                        </div>
                    {/await}

                    
                </section>
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);

        & > section {
            margin-bottom: 2rem;
        }
    }

    section.liste-especes {
        margin-bottom: 2rem;
    }
</style>
