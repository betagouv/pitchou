<script>
	import { originDémarcheNumérique } from '../../../commun/constantes.js'
	import { supprimerAvisExpert as supprimerAvisExpertServeur  } from '../../actions/avisExpert.js'
	import { refreshDossierComplet } from '../../actions/dossier.js'
    import AvisExpert from './Avis/AvisExpert.svelte'
	import { differenceInDays } from 'date-fns'
    import ModaleAjouterPièceJointe from './ModaleAjouterPièceJointe.svelte'

    /** @import {DossierComplet, FrontEndAvisExpert} from '../../../types/API_Pitchou.js' */

    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     */

    /** @type {Props} */
    let { dossier } = $props();

    const { number_demarches_simplifiées: numdos, numéro_démarche } = dossier
    const idModaleAjouterPieceJointeAvis = 'modale-ajouter-piece-jointe-avis'

    let avisExpertTriés = $derived([...dossier.avisExpert].sort((a,b) => {
        const dateA = new Date(a.date_avis ?? a.date_saisine ?? 0)
        const dateB = new Date(b.date_avis ?? b.date_saisine ?? 0)
        return differenceInDays(dateB, dateA)
    }))

    /**
     * @param {FrontEndAvisExpert} avisExpert
     */
    async function supprimerAvisExpert(avisExpert) {
        await supprimerAvisExpertServeur(avisExpert)
        await refreshDossierComplet(dossier.id)
    }
</script>

<div class="fr-grid-row">
    <section class="fr-col section-liste-avis-expert">
        <h2>Avis d'experts</h2>
        {#if avisExpertTriés.length >= 1}
            <div class="liste-avis-expert">
            {#each avisExpertTriés as avisExpert}
                <AvisExpert dossierId={dossier.id} {avisExpert} {supprimerAvisExpert} />
            {/each}
            </div>
        {:else}
            <p>
                <span class="fr-mb-3w">Aucun fichier de saisine ou fichier d'avis d'expert n'est associé à ce dossier.</span>
            </p>
        {/if}
        <button 
            type="button" 
            class="fr-btn fr-mt-3w {avisExpertTriés.length === 0 ? '' : 'fr-btn--secondary'} fr-btn--icon-left fr-icon-attachment-line" 
            aria-controls={idModaleAjouterPieceJointeAvis}
            data-fr-opened="false"
        >
            Ajouter un avis ou une saisine
        </button>
    </section>

    <section class="fr-col-5 section-boutons-démarche-numérique">
        <a class="fr-btn" target="_blank" href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/avis_new`}>
            Demander un avis
        </a>
        <a class="fr-btn fr-btn--secondary fr-mt-1w" target="_blank" href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/avis`}>
            Voir la page Avis sur Démarche Numérique
        </a>
    </section>
</div>

<ModaleAjouterPièceJointe id={idModaleAjouterPieceJointeAvis} {dossier} />

<style lang="scss">
    .section-liste-avis-expert {
        display: flex; 
        flex-direction: column;
    }
    .section-boutons-démarche-numérique {
        text-align: right;
    }
    .liste-avis-expert {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }
</style>
