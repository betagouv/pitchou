<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import NomEspèce from '../NomEspèce.svelte'
    
    import { etresVivantsAtteintsCompareEspèce } from '../../espèceFieldset';

    /** @import {DossierComplet} from '../../../types/API_Pitchou.d.ts' */
    /** @import { DescriptionMenacesEspèces,} from '../../../types/especes.d.ts' **/

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email = undefined

    /** @type {DescriptionMenacesEspèces | undefined} */
    export let espècesImpactées = undefined

    $: espècesImpactéesUniquesTriées = espècesImpactées && Object.fromEntries(
        Object.entries(espècesImpactées)
        .map(([classif, espècesImpactées]) => {
            return [
                classif, 
                [...new Set(
                    espècesImpactées
                        .toSorted(etresVivantsAtteintsCompareEspèce)
                        .map(({espèce}) => espèce)
                )]
            ]
        })
    )


</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Aide à la Rédaction arrêté préfectoral</h1>
            <h2>Dossier {dossier.nom_dossier || "sans nom"}</h2>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2>Liste des espèces protégées</h2>
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
