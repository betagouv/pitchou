<script>
    import { tick } from 'svelte';
    import TuileSaisieEspèce from '../SaisieEspèces/TuileSaisieEspèce.svelte'

    /** @import {ParClassification, EspèceProtégée, DescriptionImpact, ActivitéMenançante, MéthodeMenançante, TransportMenançant} from "../../../types/especes.js" */


    /**
     * @typedef {Object} Props
     * @property {number} [index]
     * @property {Array<{ espèce?: EspèceProtégée, impacts?: DescriptionImpact[] }>} [espècesImpactées]
     * @property {EspèceProtégée[]} [espècesProtégées]
     * @property {ParClassification<Map<ActivitéMenançante['Identifiant Pitchou'], ActivitéMenançante>>} [activitesParClassificationEtreVivant]
     * @property {ParClassification<Map<MéthodeMenançante['Code'], MéthodeMenançante>>} méthodesParClassificationEtreVivant
     * @property {ParClassification<Map<TransportMenançant['Code'], TransportMenançant>>} transportsParClassificationEtreVivant
     */

    /** @type {Props} */
    let {
        espècesImpactées = $bindable([{impacts: [{}]}]),
        espècesProtégées = [],
        activitesParClassificationEtreVivant,
        méthodesParClassificationEtreVivant,
        transportsParClassificationEtreVivant,
    } = $props();

    async function ajouterEspèce() {
        espècesImpactées.push({
            impacts: [{}]
        })
        await tick()
        référencesEspèces[référencesEspèces.length - 1].focusFormulaireEspèce()
    }

    /**
     * @param {number} indexEspèceÀSupprimer
     */
    async function onSuprimerEspèce(indexEspèceÀSupprimer) {
        espècesImpactées.splice(indexEspèceÀSupprimer, 1)
        espècesImpactées = espècesImpactées
        await tick()
        référencesEspèces = référencesEspèces.filter(e => e !== null)

        if (espècesImpactées.length === 0) {
            await ajouterEspèce()
        } else {
            let indexEspèceÀFocus = indexEspèceÀSupprimer === espècesImpactées.length
            ? espècesImpactées.length - 1
            : indexEspèceÀSupprimer

            référencesEspèces[indexEspèceÀFocus].focusBoutonSupprimer()
        }
    }

    /**
     * @type {TuileSaisieEspèce[]}
     */
    let référencesEspèces = $state([])
</script>


{#each espècesImpactées as espècesImpactée, indexEspècesImpactée (espècesImpactée)}
    <TuileSaisieEspèce
        bind:this={référencesEspèces[indexEspècesImpactée]}
        index={indexEspècesImpactée + 1}
        bind:espèce={espècesImpactées[indexEspècesImpactée].espèce}
        bind:descriptionImpacts={espècesImpactées[indexEspècesImpactée].impacts}
        onSuprimerEspèce={async () => {await onSuprimerEspèce(indexEspècesImpactée) }}
        espècesProtégées={espècesProtégées}
        activitesParClassificationEtreVivant={activitesParClassificationEtreVivant}
        méthodesParClassificationEtreVivant={méthodesParClassificationEtreVivant}
        transportsParClassificationEtreVivant={transportsParClassificationEtreVivant}
    />
{/each}

<button class="fr-btn fr-btn--secondary" type="button" onclick={ajouterEspèce}>
    Ajouter une espèce
</button>
