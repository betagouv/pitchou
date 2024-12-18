<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import BarreRecherche from '../BarreRecherche.svelte'
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import {trouverDossiersIdCorrespondantsÀTexte} from '../../rechercherDansDossier.js'
    import {retirerAccents} from '../../../commun/manipulationStrings.js'

    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierComplet, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types/API_Pitchou.js' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import {default as Personne} from '../../../types/database/public/Personne.ts' */
    /** @import {default as ÉvènementPhaseDossier} from '../../../types/database/public/ÉvènementPhaseDossier.ts' */

    /** @type {(DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]})[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {ComponentProps<Squelette>['email']} */
    export let email;
    /** @type {ComponentProps<Squelette>['erreurs']} */
    export let erreurs;

    $: dossiersIdSuivisParInstructeurActuel = relationSuivis && email && relationSuivis.get(email)

    $: dossiersIdSuivisParAucunInstructeur = relationSuivis && (() => {
        // démarrer avec tous les ids
        const dossierIdsSansSuivi = new Set(dossiers.map(d => d.id))

        // retirer les ids suivis par au moins un.e instructeur.rice
        for(const dossierIds of relationSuivis.values()){
            for(const dossierId of dossierIds){
                dossierIdsSansSuivi.delete(dossierId)
            }
        }

        return dossierIdsSansSuivi
    })()

    /** @type {(DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]})[]} */
    $: dossiersSelectionnés = dossiers
    //$: console.log('dossiersSelectionnés', dossiersSelectionnés)

    /** @type {Map<'département' | 'commune' | 'phase' | 'prochaine action attendue de' | 'texte' | 'suivis' | 'instructeurs', (d: DossierComplet & {évènementsPhase: ÉvènementPhaseDossier[]}) => boolean>}*/
    const tousLesFiltres = new Map()

    function filtrerDossiers(){
		let nouveauxDossiersSélectionnés = dossiers;

		for(const filtre of tousLesFiltres.values()){
			nouveauxDossiersSélectionnés = nouveauxDossiersSélectionnés.filter(filtre)
		}

		dossiersSelectionnés = nouveauxDossiersSélectionnés;
	}


    /** @type {Set<NonNullable<DossierPhase>>}*/
    const phaseOptions = new Set([...phases])

    /** @type {Set<DossierPhase>} */
    // @ts-ignore
    $: phasesFiltrées = new Set()

    /**
     * 
     * @param {Set<DossierPhase>} phasesSélectionnées
     */
	function filtrerParPhase(phasesSélectionnées){
        tousLesFiltres.set('phase', dossier => {
            //@ts-expect-error dossier.évènementsPhase[0].phase est de type DossierPhase (enfin, on l'espère...
            return phasesSélectionnées.has(dossier.évènementsPhase[0].phase)
        })

        phasesFiltrées = new Set(phasesSélectionnées)

		filtrerDossiers()
	}


    const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = '(vide)'
    const prochainesActionsAttenduesParOptions = new Set([...prochaineActionAttenduePar, PROCHAINE_ACTION_ATTENDUE_PAR_VIDE])

    /** @type {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} */
   // @ts-ignore
    $: prochainesActionsAttenduesParFiltrées = new Set()

    /**
     * 
     * @param {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} prochainesActionsAttenduesParSélectionnées
     */
    function filtrerParProchainesActionsAttenduesPar(prochainesActionsAttenduesParSélectionnées) {
        tousLesFiltres.set("prochaine action attendue de", dossier => {
            if (prochainesActionsAttenduesParSélectionnées.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE)) {
                return !dossier.prochaine_action_attendue_par
            }

            return prochainesActionsAttenduesParSélectionnées.has(dossier.prochaine_action_attendue_par)
        })

        // @ts-ignore
        prochainesActionsAttenduesParFiltrées = new Set(prochainesActionsAttenduesParSélectionnées)

        filtrerDossiers()
    }

    $: texteÀChercher = ''

    /**
     * @param {string} _texteÀChercher
     */
    function filtrerParTexte(_texteÀChercher) {
        // cf. https://github.com/MihaiValentin/lunr-languages/issues/66
        // lunr.fr n'indexe pas les chiffres. On gère donc la recherche sur 
        // les nombres avec une fonction séparée.
        if (_texteÀChercher.match(/\d[\dA-Za-z\-]*/)) {
            tousLesFiltres.set('texte', dossier => {
                const {
                    id, 
                    départements, 
                    communes, 
                    number_demarches_simplifiées,
                    historique_identifiant_demande_onagre,
                } = dossier
                const communesCodes = communes?.map(({postalCode}) => postalCode).filter(c => c) || []
            
                return String(id) === _texteÀChercher ||
                    départements?.includes(_texteÀChercher) || 
                    communesCodes?.includes(_texteÀChercher) ||
                    number_demarches_simplifiées === _texteÀChercher || 
                    historique_identifiant_demande_onagre === _texteÀChercher
            })
        } else {
            const texteSansAccents = retirerAccents(_texteÀChercher)
            // Pour chercher les communes qui contiennent des tirets avec lunr,
            // on a besoin de passer la chaîne de caractères entre "".
            const aRechercher = texteSansAccents.match(/(\w-)+/) ? 
                `"${texteSansAccents}"` :
                texteSansAccents
            const dossiersIdCorrespondantsÀTexte = trouverDossiersIdCorrespondantsÀTexte(aRechercher, dossiers)

            tousLesFiltres.set('texte', dossier => {
                return dossiersIdCorrespondantsÀTexte.has(dossier.id)
            })
        }

        texteÀChercher = _texteÀChercher;

        filtrerDossiers()
    }

    /**
     * 
     * @param {Event} e
     */
    function onSupprimerFiltreTexte(e) {
        e.preventDefault()
     
        tousLesFiltres.delete('texte')

        texteÀChercher = ''
        filtrerDossiers()
    }

    const AUCUN_INSTRUCTEUR = '(aucun instructeur)'
    const instructeurEmailOptions = (relationSuivis && Array.from(relationSuivis.keys()).sort()) || []
    
    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>}*/
    const instructeursOptions = new Set([AUCUN_INSTRUCTEUR, ...instructeurEmailOptions])

    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} */
    $: instructeursSélectionnés = new Set()

    /**
     * 
     * @param {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} _instructeursSélectionnées
     */
	function filtrerParInstructeurs(_instructeursSélectionnées){
        tousLesFiltres.set('instructeurs', dossier => {
            if(!relationSuivis)
                return true;

            if (_instructeursSélectionnées.has(AUCUN_INSTRUCTEUR) && dossiersIdSuivisParAucunInstructeur && dossiersIdSuivisParAucunInstructeur.has(dossier.id)) {
                return true
            }

            for(const instructeurEmail of _instructeursSélectionnées){
                const dossiersIdsSuivisParCetInstructeur = relationSuivis.get(instructeurEmail)
                if(dossiersIdsSuivisParCetInstructeur && dossiersIdsSuivisParCetInstructeur.has(dossier.id))
                    return true
            }

            return false
        })

        instructeursSélectionnés = new Set(_instructeursSélectionnées)

		filtrerDossiers()
	}

    let filtrerUniquementDossiersSuivi = false;

    $: if(filtrerUniquementDossiersSuivi){
        if(dossiersIdSuivisParInstructeurActuel){
            tousLesFiltres.set('suivis', dossier => dossiersIdSuivisParInstructeurActuel.has(dossier.id))

            filtrerDossiers()
        }
    }
    else{
        tousLesFiltres.delete('suivis')
        filtrerDossiers()
    }

    
</script>

<Squelette {email} {erreurs}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <div class="fr-col">

            <h1>Suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr></h1>

            {#if dossiers.length >= 1}
                <BarreRecherche
                    titre="Rechercher par texte libre"
                    mettreÀJourTexteRecherche={filtrerParTexte}
                />

                <div class="filtres">
                    <FiltreParmiOptions 
                        titre="Filtrer par phase"
                        options={phaseOptions} 
                        mettreÀJourOptionsSélectionnées={filtrerParPhase} 
                    />
                    <FiltreParmiOptions 
                        titre="Filtrer par prochaine action attendue par"
                        options={prochainesActionsAttenduesParOptions} 
                        mettreÀJourOptionsSélectionnées={filtrerParProchainesActionsAttenduesPar} 
                    />
                    {#if instructeursOptions && instructeursOptions.size >= 2}
                    <FiltreParmiOptions 
                        titre="Filtrer par instructeur suivant le dossier"
                        options={instructeursOptions} 
                        mettreÀJourOptionsSélectionnées={filtrerParInstructeurs} 
                    />
                    {/if}
                    {#if dossiersIdSuivisParInstructeurActuel && dossiersIdSuivisParInstructeurActuel.size >= 1}
                    <div class="fr-checkbox-group flex">
                        <input bind:checked={filtrerUniquementDossiersSuivi} name="checkbox-1" id="checkbox-1" type="checkbox">
                        <label class="fr-label" for="checkbox-1">
                            Afficher uniquement mes dossiers suivis
                        </label>
                    </div>
                    {/if}
                </div>

                <div class="filtres-actifs">
                    {#if phasesFiltrées.size >= 1}
                        <span class="fr-badge fr-badge--sm">Phases : {[...phasesFiltrées].join(", ")}</span>
                    {/if}
                    {#if prochainesActionsAttenduesParFiltrées.size >= 1}
                        <span class="fr-badge fr-badge--sm">Prochaine action attendue par : {[...prochainesActionsAttenduesParFiltrées].join(", ")}</span>
                    {/if}
                    {#if texteÀChercher}
                        <span class="fr-badge fr-badge--sm">Texte cherché : {texteÀChercher}</span>
                        <button on:click={onSupprimerFiltreTexte}>✖</button>
                    {/if}
                    {#if instructeursSélectionnés.size >= 1}
                        <span class="fr-badge instructeurs fr-badge--sm">Instructeurs : {[...instructeursSélectionnés].join(", ")}</span>
                    {/if}
                </div>
                    
                <h2 class="fr-mt-2w">{dossiersSelectionnés.length}<small>/{dossiers.length}</small> dossiers affichés</h2>

                <div class="fr-table fr-table--bordered">
                    <table>
                        <thead>
                            <tr>
                                <th>Voir le dossier</th>
                                <th>Localisation</th>
                                <th>Activité principale</th>
                                <th>Porteur de projet</th>
                                <th>Nom du projet</th>
                                <th>Enjeux</th>
                                <th>Rattaché au régime AE</th>
                                <th>Phase</th>
                                <th>Prochaine action attendue</th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each dossiersSelectionnés as { id, nom_dossier, déposant_nom,
                            déposant_prénoms, communes, départements, régions,
                            activité_principale, rattaché_au_régime_ae,
                            enjeu_politique, enjeu_écologique,
                            évènementsPhase, prochaine_action_attendue_par }}
                                {@const phase = évènementsPhase[0].phase}
                                <tr>
                                    <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                    <td>{formatLocalisation({communes, départements, régions})}</td>
                                    <td>{activité_principale || ''}</td>
                                    <td>{formatDéposant({déposant_nom, déposant_prénoms})}</td>
                                    <td>{nom_dossier || ''}</td>
                                    <td>
                                        {#if enjeu_politique}
                                            <p class="fr-badge fr-badge--sm fr-badge--blue-ecume">
                                                Enjeu politique
                                            </p>
                                        {/if}

                                        {#if enjeu_écologique}
                                        <p class="fr-badge fr-badge--sm fr-badge--green-emeraude">
                                            Enjeu écologique
                                        </p>
                                        {/if}

                                    </td>
                                    <td>
                                        {rattaché_au_régime_ae ? "oui" : "non"}
                                    </td>
                                    <td>{phase}</td>
                                    <td>{prochaine_action_attendue_par || ''}</td>
                                </tr>
                            {/each}
                        </tbody>

                    </table>
                </div>
            {:else}
                <div class="fr-mb-5w">Vous n'avez pas encore de dossiers dans votre groupe instructeurs</div>
            {/if}
        </div>
    </div>

</Squelette>

<style lang="scss">
    td, th{
        vertical-align: top;
    }

    th {
        min-width: 6rem;
    }

    h2 small{
        font-size: 0.7em;
        color: var(--text-mention-grey)
    }

    .fr-badge:not(.instructeurs) {
        white-space: nowrap;
    }

    .filtres {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .filtres-actifs {
        margin-bottom: 0.5rem;
    }
</style>
