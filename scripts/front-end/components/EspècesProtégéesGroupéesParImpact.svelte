<script>
    /** @import {ActivitéMenançante,  DescriptionMenacesEspèces, ImpactQuantifié } from "../../types/especes" */

	import { créerEspècesGroupéesParImpact } from "../actions/créerEspècesGroupéesParImpact"
    /**
     * @typedef {Object} Props
     * @property {DescriptionMenacesEspèces} espècesImpactées
     * @property {Map<string, ActivitéMenançante & {impactsQuantifiés: ImpactQuantifié[]}>} identifiantPitchouVersActivitéEtImpactsQuantifiés
     */

    /** @type {Props} */
    let { 
        espècesImpactées,
        identifiantPitchouVersActivitéEtImpactsQuantifiés
    } = $props();


    let espècesImpactéesParActivité = $derived(créerEspècesGroupéesParImpact(espècesImpactées, identifiantPitchouVersActivitéEtImpactsQuantifiés))
</script>




{#each espècesImpactéesParActivité as { activité, espèces, impactsQuantifiés }}
    <section class="liste-especes">
        <h3>{activité}</h3>
        <table class="fr-table">
            <thead>
                <tr>
                    <th>Espèce</th>
                    {#if impactsQuantifiés && impactsQuantifiés.length >= 1}
                        {#each impactsQuantifiés as nomColonne}
                            <th>{nomColonne}</th>
                        {/each}
                    {/if}
                </tr>
            </thead>
            <tbody>
                {#each espèces as { nomVernaculaire, nomScientifique, détails }}
                    <tr>
                        <td
                            >{nomVernaculaire} (<i
                                >{nomScientifique}</i
                            >)</td
                        >
                        {#each détails as détail}
                            <td>{détail}</td>
                        {/each}
                    </tr>
                {/each}
            </tbody>
        </table>
    </section>
{/each}


<style lang="scss">
    .liste-especes {
        margin-top: 2rem;
        margin-bottom: 2rem;

        h3 {
            margin-bottom: 1rem;
        }
    }
</style>

