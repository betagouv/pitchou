<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    import NomEspèce from '../NomEspèce.svelte'
    
    import { importDescriptionMenacesEspècesFromURL } from '../../../commun/outils-espèces.js';

    import { etresVivantsAtteintsCompareEspèce } from '../../espèceFieldset';

    /** @import {DossierComplet} from '../../../types.js' */
    /** @import { ClassificationEtreVivant, EspèceProtégée, ActivitéMenançante, MéthodeMenançante, TransportMenançant, DescriptionMenacesEspèces,} from '../../../types/especes.d.ts' **/

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email

    const {espèces_protégées_concernées} = dossier

    /** @type {Map<EspèceProtégée['CD_REF'], EspèceProtégée>} */
    export let espèceByCD_REF;

    /** @type {Map<ClassificationEtreVivant, ActivitéMenançante[]>} */
    export let activités

    /** @type {Map<ClassificationEtreVivant, MéthodeMenançante[]>} */
    export let méthodes

    /** @type {Map<ClassificationEtreVivant, TransportMenançant[]>} */
    export let transports

    /**
     * 
     * @param {DossierComplet['espèces_protégées_concernées']} url
     * @returns {DescriptionMenacesEspèces | undefined}
     */
    function fromEspèceProtégéeURLString(url){
        if(!url)
            return undefined

        return importDescriptionMenacesEspècesFromURL(
            new URL(url), 
            espèceByCD_REF, 
            [...activités.values()].flat(), 
            [...méthodes.values()].flat(), 
            [...transports.values()].flat()
        )
    }

    /** @type {DescriptionMenacesEspèces | undefined} */
    $: descriptionMenacesEspèces = fromEspèceProtégéeURLString(espèces_protégées_concernées)

    $: console.log('descriptionMenacesEspèces', descriptionMenacesEspèces)

</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Aide à la Rédaction arrêté préfectoral</h1>
            <h2>Dossier {dossier.nom_dossier || "sans nom"}</h2>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2>Liste des espèces protégées</h2>
                    {#if descriptionMenacesEspèces}
                    {#each Object.keys(descriptionMenacesEspèces) as classif}
                        {#if descriptionMenacesEspèces[classif].length >= 1}
                            <section class="liste-especes">
                                <h3>Liste des {classif}</h3>
                                {#each descriptionMenacesEspèces[classif].toSorted(etresVivantsAtteintsCompareEspèce) as  espèceAtteinte, index (espèceAtteinte) }
                                    {#if index !== 0 },&nbsp;{/if}<NomEspèce espèce={espèceAtteinte.espèce}/>
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
