<script>
    import { onMount } from 'svelte';
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import BarreRecherche from '../BarreRecherche.svelte'
    import TrisDeTh from '../TrisDeTh.svelte'
    import TagPhase from '../TagPhase.svelte'
    import TagEnjeu from '../TagEnjeu.svelte'
    import IndicateurDélaiPhase from '../IndicateurDélaiPhase.svelte'
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import {trouverDossiersIdCorrespondantsÀTexte} from '../../rechercherDansDossier.js'
    import {retirerAccents} from '../../../commun/manipulationStrings.js'
    import {trierDossiersParOrdreAlphabétiqueColonne, trierDossiersParPhaseProchaineAction} from '../../triDossiers.js'
    
    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierDemarcheSimplifiee88444} from '../../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts'*/
    /** @import {DossierRésumé, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types/API_Pitchou.ts' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import {default as Personne} from '../../../types/database/public/Personne.ts' */
    /** @import  { TriTableauSuiviDDEP } from '../../../types/interfaceUtilisateur.ts' */


    /** @type {DossierRésumé[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {DossierDemarcheSimplifiee88444["Activité principale"][] | undefined} */
    export let activitésPrincipales = undefined

    /** @type {NonNullable<ComponentProps<Squelette>['email']>} */
    export let email;
    /** @type {ComponentProps<Squelette>['erreurs']} */
    export let erreurs;

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

    /** @type {DossierRésumé[]} */
    let dossiersSelectionnés = []
    //$: console.log('dossiersSelectionnés', dossiersSelectionnés)

    /** @type {TriTableauSuiviDDEP | undefined} */
    let triSélectionné = undefined

    /** @type {Map<'département' | 'commune' | 'phase' | 'prochaine action attendue de' | 'texte' | 'suivis' | 'instructeurs' | 'activité principale', (d: DossierRésumé) => boolean>} */
    const tousLesFiltres = new Map()

    function filtrerDossiers(){
		let nouveauxDossiersSélectionnés = dossiers;

		for(const filtre of tousLesFiltres.values()){
			nouveauxDossiersSélectionnés = nouveauxDossiersSélectionnés.filter(filtre)
		}

		dossiersSelectionnés = nouveauxDossiersSélectionnés;
        if(triSélectionné){
            triSélectionné.trier()
        }
	}


    /** @type {Set<DossierPhase>}*/
    const phaseOptions = new Set([...phases])

    /** @type {Set<DossierPhase>} */
    let phasesSélectionnées = new Set([
        'Accompagnement amont',
        'Étude recevabilité DDEP',
        'Instruction'
    ])

    /**
     *
     * @param {DossierPhase} phase
     */
    function makeTagPhaseOnClick(phase){
        return () => {
            if(phasesSélectionnées.has(phase)){
                phasesSélectionnées.delete(phase)
            }
            else{
                phasesSélectionnées.add(phase)
            }

            phasesSélectionnées = phasesSélectionnées; // re-render

            filtrerDossiers()
        }
    }

    tousLesFiltres.set('phase', dossier => {
        return phasesSélectionnées.has(dossier.phase)
    })


    const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = '(vide)'
    const prochainesActionsAttenduesParOptions = new Set([...prochaineActionAttenduePar, PROCHAINE_ACTION_ATTENDUE_PAR_VIDE])

    /** @type {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} */
    // @ts-ignore
    let prochainesActionsAttenduesParFiltrées = new Set()

    /**
     *
     * @param {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} prochainesActionsAttenduesParSélectionnées
     */
    function filtrerParProchainesActionsAttenduesPar(prochainesActionsAttenduesParSélectionnées) {
        tousLesFiltres.set("prochaine action attendue de", dossier => {
            if (prochainesActionsAttenduesParSélectionnées.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE)) {
                return !dossier.prochaine_action_attendue_par
            }

            // @ts-ignore
            return prochainesActionsAttenduesParSélectionnées.has(dossier.prochaine_action_attendue_par)
        })

        // @ts-ignore
        prochainesActionsAttenduesParFiltrées = new Set(prochainesActionsAttenduesParSélectionnées)

        filtrerDossiers()
    }

    let texteÀChercher = ''

    /**
     * @param {string} _texteÀChercher
     */
    function filtrerParTexte(_texteÀChercher) {
        const texteÀChercherSansEspace = _texteÀChercher.trim()

        // cf. https://github.com/MihaiValentin/lunr-languages/issues/66
        // lunr.fr n'indexe pas les chiffres. On gère donc la recherche sur
        // les nombres avec une fonction séparée.
        if (texteÀChercherSansEspace.match(/\d[\dA-Za-z\-]*/)) {
            tousLesFiltres.set('texte', dossier => {
                const {
                    id,
                    départements,
                    communes,
                    number_demarches_simplifiées,
                    historique_identifiant_demande_onagre,
                } = dossier
                const communesCodes = communes?.map(({postalCode}) => postalCode).filter(c => c) || []

                return String(id) === texteÀChercherSansEspace ||
                    départements?.includes(texteÀChercherSansEspace) ||
                    communesCodes?.includes(texteÀChercherSansEspace) ||
                    number_demarches_simplifiées === texteÀChercherSansEspace ||
                    historique_identifiant_demande_onagre === texteÀChercherSansEspace
            })
        } else {
            const texteSansAccents = retirerAccents(texteÀChercherSansEspace)
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

        texteÀChercher = texteÀChercherSansEspace;

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

    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} */
    const instructeursOptions = new Set([email, AUCUN_INSTRUCTEUR, ...instructeurEmailOptions])

    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} */
    let instructeursSélectionnés = new Set([email])

    tousLesFiltres.set('instructeurs', dossier => {
        if(!relationSuivis)
            return true;

        if (instructeursSélectionnés.has(AUCUN_INSTRUCTEUR) && dossiersIdSuivisParAucunInstructeur && dossiersIdSuivisParAucunInstructeur.has(dossier.id)) {
            return true
        }

        for(const instructeurEmail of instructeursSélectionnés){
            const dossiersIdsSuivisParCetInstructeur = relationSuivis.get(instructeurEmail)
            if(dossiersIdsSuivisParCetInstructeur && dossiersIdsSuivisParCetInstructeur.has(dossier.id))
                return true
        }

        return false
    })

    /**
     *
     * @param {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} _instructeursSélectionnées
     */
	function filtrerParInstructeurs(_instructeursSélectionnées){
        instructeursSélectionnés = new Set(_instructeursSélectionnées)

		filtrerDossiers()
	}



    /** @type {Set<DossierDemarcheSimplifiee88444["Activité principale"]>} */
    let activitésPrincipalesSélectionnées = new Set()

    /**
     *
     * @param {Set<DossierDemarcheSimplifiee88444["Activité principale"]>} _activitésPrincipalesSélectionnées
     */
    function filtrerParActivitéPrincipale(_activitésPrincipalesSélectionnées) {
        tousLesFiltres.set('activité principale', dossier => {
            if(!dossier.activité_principale)
                return false
            else
                return _activitésPrincipalesSélectionnées.has(dossier.activité_principale)
        })

        activitésPrincipalesSélectionnées = new Set(_activitésPrincipalesSélectionnées)

		filtrerDossiers()
    }

    const trisActivitéPrincipale = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "activité_principale") }, },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "activité_principale").reverse()},  },
    ]

    const trisNomProjet = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "nom") } },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "nom").reverse() } },
    ]

    const trisLocalisation = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "localisation") } },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "localisation").reverse() } },
    ]

    const trisDéposant = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "déposant") } },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "déposant").reverse() } },
    ]

    const triPriorisationPhaseProchaineAction = [
        { nom: "Prioriser", trier(){ dossiersSelectionnés = trierDossiersParPhaseProchaineAction(dossiersSelectionnés) } }
    ]

    // filtrage avec les filtres initiaux
    onMount(async () => {
        filtrerDossiers()
	});
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

                <div class="fr-mb-2w">
                    <strong>Filtrer par phase</strong>
                    {#each phaseOptions as phase}
                        <TagPhase {phase} classes={['fr-mr-1w']} onClick={makeTagPhaseOnClick(phase)} ariaPressed={phasesSélectionnées.has(phase)}></TagPhase>
                    {/each}
                </div>

                <div class="filtres">
                    <FiltreParmiOptions
                        titre="Filtrer par activité principale"
                        options={new Set(activitésPrincipales)}
                        mettreÀJourOptionsSélectionnées={filtrerParActivitéPrincipale}
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
                        optionsSélectionnées={instructeursSélectionnés}
                        mettreÀJourOptionsSélectionnées={filtrerParInstructeurs}
                    />
                    {/if}
                </div>

                <section class="filtres-actifs fr-mb-1w">
                    {#if instructeursSélectionnés.size >= 1}
                        <div class="fr-mb-1w">
                            <span>Dossiers suivis par&nbsp;:</span>
                            {#each [...instructeursSélectionnés] as instructeur}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {instructeur}
                                </span>
                            {/each}
                        </div>
                    {/if}
                    {#if prochainesActionsAttenduesParFiltrées.size >= 1}
                        <div class="fr-mb-1w">
                            <span>Prochaine action attendue par&nbsp;:</span>
                            {#each [...prochainesActionsAttenduesParFiltrées] as prochaineActionAttenduePar}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {prochaineActionAttenduePar}
                                </span>
                            {/each}
                        </div>
                    {/if}
                    {#if activitésPrincipalesSélectionnées.size >= 1}
                        <div class="fr-mb-1w">
                            <span>Activités principales&nbsp;:</span>
                            {#each [...activitésPrincipalesSélectionnées] as activitéPrincipale}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {activitéPrincipale}
                                </span>
                            {/each}
                        </div>
                    {/if}
                    {#if texteÀChercher}
                        <div class="fr-mb-1w">
                            <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">Texte cherché : {texteÀChercher}</span>
                            <button on:click={onSupprimerFiltreTexte}>✖</button>
                        </div>
                    {/if}
                </section>

                <h2 class="fr-mt-2w">{dossiersSelectionnés.length}<small>/{dossiers.length}</small> dossiers affichés</h2>

                <div class="fr-table fr-table--bordered">
                    <table>
                        <thead>
                            <tr>
                                <th>Voir le dossier</th>
                                <th>
                                    Localisation
                                    <TrisDeTh
                                        tris={trisLocalisation}
                                        bind:triSélectionné
                                    />
                                </th>
                                <th>
                                    Activité principale
                                    <TrisDeTh
                                        tris={trisActivitéPrincipale}
                                        bind:triSélectionné
                                    />
                                </th>
                                <th>
                                    Porteur de projet
                                    <TrisDeTh
                                        tris={trisDéposant}
                                        bind:triSélectionné
                                    />
                                </th>
                                <th>
                                    Nom du projet
                                    <TrisDeTh
                                        tris={trisNomProjet}
                                        bind:triSélectionné
                                    />
                                </th>
                                <th>Enjeux</th>
                                <th>Rattaché au régime AE</th>
                                <th>
                                    Phase<br>
                                    <br>
                                    Prochaine action attendue de
                                    <TrisDeTh
                                        tris={triPriorisationPhaseProchaineAction}
                                        bind:triSélectionné
                                    />
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {#each dossiersSelectionnés as { id, nom, déposant_nom,
                            déposant_prénoms, communes, départements, régions,
                            activité_principale, rattaché_au_régime_ae,
                            enjeu_politique, enjeu_écologique,
                            phase, prochaine_action_attendue_par }, i}
                                <tr>
                                    <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                    <td>{formatLocalisation({communes, départements, régions})}</td>
                                    <td>{activité_principale || ''}</td>
                                    <td>{formatDéposant({déposant_nom, déposant_prénoms})}</td>
                                    <td>{nom || ''}</td>
                                    <td>
                                        {#if enjeu_politique}
                                            <TagEnjeu enjeu="politique" taille='SM' classes={["fr-mb-1w"]}></TagEnjeu>
                                        {/if}

                                        {#if enjeu_écologique}
                                            <TagEnjeu enjeu="écologique" taille='SM' classes={["fr-mb-1w"]}></TagEnjeu>
                                        {/if}
                                    </td>
                                    <td>
                                        {rattaché_au_régime_ae ? "oui" : "non"}
                                    </td>
                                    <td>
                                        <TagPhase {phase} taille='SM'></TagPhase>
                                        <IndicateurDélaiPhase dossier={dossiersSelectionnés[i]}></IndicateurDélaiPhase>
                                        {#if prochaine_action_attendue_par}
                                            <p class="fr-tag fr-tag--sm fr-mt-1w">{prochaine_action_attendue_par}</p>
                                        {/if}
                                    </td>
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

    .filtres {
        display: flex;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .filtres-actifs {
        margin-bottom: 0.5rem;
    }
</style>
