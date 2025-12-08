<script>
	import { originDémarcheNumérique } from '../../../commun/constantes.js'
	import { supprimerAvisExpert as _supprimerAvisExpert  } from '../../actions/avisExpert.js'
	import { refreshDossierComplet } from '../../actions/dossier.js'
    import FormulaireAvisExpert from './Avis/FormulaireAvisExpert.svelte'
    import AvisExpert from './Avis/AvisExpert.svelte'
	import { differenceInDays } from 'date-fns'

    /** @import {DossierComplet, FrontEndAvisExpert} from '../../../types/API_Pitchou.js' */

    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    const { number_demarches_simplifiées: numdos, numéro_démarche } = dossier

    let avisExpertTriés = $derived( [...dossier.avisExpert].sort((a,b) => {
        const dateA = new Date(a.date_avis ?? a.date_saisine ?? 0)
        const dateB = new Date(b.date_avis ?? b.date_saisine ?? 0)
        return differenceInDays(dateB, dateA)
    }

))

    /**@type {boolean}*/
    let afficherFormulaireAjouter = $state(false)

    /**
     * @param {FrontEndAvisExpert} avisExpert
     */
    async function supprimerAvisExpert(avisExpert) {
        await _supprimerAvisExpert(avisExpert)
        await refreshDossierComplet(dossier.id)
    }
</script>

<div class="row">
    <section>
        <h2>Avis d'experts</h2>
        {#if avisExpertTriés.length >= 1}
            {#each dossier.avisExpert as avisExpert}
                <AvisExpert {dossier} {avisExpert} {supprimerAvisExpert} />
            {/each}
        {:else}
            Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.
        {/if}
        {#if afficherFormulaireAjouter === false}
            <button onclick={() => afficherFormulaireAjouter = true} class="fr-btn fr-btn--icon-left fr-icon-add-line {dossier.avisExpert.length >= 1 ? 'fr-btn--secondary' : 'fr-btn--primary'}">Ajouter un avis d'expert</button>
        {:else}
            <FormulaireAvisExpert {dossier} fermerLeFormulaire={() => afficherFormulaireAjouter = false} />
        {/if}
    </section>

    <section>
        <a class="fr-btn" target="_blank" href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/avis_new`}>
            Demander un avis
        </a>
        <a class="fr-btn fr-btn--secondary" target="_blank" href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/avis`}>
            Voir la page Avis sur Démarche Numérique
        </a>
    </section>

</div>

<style lang="scss">
    .row{
        display: flex;
        flex-direction: row;

        &>:nth-child(1){
            flex: 3;
        }

        &>:nth-child(2){
            flex: 2;

            text-align: right;
        }
    }
</style>
