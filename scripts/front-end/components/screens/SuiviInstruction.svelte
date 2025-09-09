<script>
    import { onMount } from 'svelte';
    import { SvelteSet, SvelteMap } from 'svelte/reactivity';
    
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import BarreRecherche from '../BarreRecherche.svelte'
    import TrisDeTh from '../TrisDeTh.svelte'
    import TagPhase from '../TagPhase.svelte'
    import TagEnjeu from '../TagEnjeu.svelte'
    import BoutonModale from '../DSFR/BoutonModale.svelte'
    import Pagination from '../DSFR/Pagination.svelte'
    import IndicateurDélaiPhase from '../IndicateurDélaiPhase.svelte'
    import {formatLocalisation, formatPorteurDeProjet, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import {trouverDossiersIdCorrespondantsÀTexte} from '../../rechercherDansDossier.js'
    import {retirerAccents} from '../../../commun/manipulationStrings.js'
    import {trierDossiersParOrdreAlphabétiqueColonne, trierDossiersParPhaseProchaineAction} from '../../triDossiers.js'
    import {instructeurLaisseDossier, instructeurSuitDossier} from '../../actions/suiviDossier.js';
    
    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierDemarcheSimplifiee88444} from '../../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts'*/
    /** @import {DossierRésumé, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types/API_Pitchou.ts' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import {default as Dossier} from '../../../types/database/public/Dossier.ts' */
    /** @import {default as Personne} from '../../../types/database/public/Personne.ts' */
    /** @import { FiltresLocalStorage, TriTableau } from '../../../types/interfaceUtilisateur.ts' */

    /**
     * @typedef {Object} Props
     * @property {NonNullable<ComponentProps<typeof Squelette>['email']>} email
     * @property {ComponentProps<typeof Squelette>['erreurs']} erreurs
     * @property {ComponentProps<typeof Squelette>['résultatsSynchronisationDS88444']} résultatsSynchronisationDS88444
     * @property {DossierRésumé[]} [dossiers]
     * @property {PitchouState['relationSuivis']} relationSuivis
     * @property {DossierDemarcheSimplifiee88444["Activité principale"][] | undefined} [activitésPrincipales]
     * @property {TriTableau['id'] | undefined} [triIdSélectionné]
     * @property {Partial<FiltresLocalStorage>} [filtresSélectionnés]
     * @property {any} rememberTriFiltres
     */

    /** @type {Props} */
    let {
        email,
        erreurs,
        résultatsSynchronisationDS88444,
        dossiers = [],
        relationSuivis,
        activitésPrincipales = [],
        triIdSélectionné = undefined,
        filtresSélectionnés = {},
        rememberTriFiltres
    } = $props();

    //$inspect('dossiers', dossiers)
    //$inspect('filtresSélectionnés', filtresSélectionnés)
    $inspect('relationSuivis', relationSuivis)

    let dossiersIdSuivisParAucunInstructeur = $derived.by(() => {
        if(!relationSuivis){
            return new SvelteSet()
        }

        // démarrer avec tous les ids
        let dossierIdsSansSuivi = new Set(dossiers.map(d => d.id))

        // retirer les ids suivis par au moins un.e instructeur.rice
        for(const dossierIds of relationSuivis.values()){
            dossierIdsSansSuivi = dossierIdsSansSuivi.difference(dossierIds)
        }

        return new SvelteSet(dossierIdsSansSuivi)
    })

    /** @type {DossierRésumé[]} */
    let dossiersSelectionnés = $state([])

    //$inspect('dossiersSelectionnés', dossiersSelectionnés)

    $effect(() => {
        console.log('relationSuivis effect', relationSuivis)
    })

    /** @type {Set<Dossier['id']>} */
    let dossierIdsSuivisParInstructeurActuel = $derived(relationSuivis?.get(email) || new SvelteSet())

    $inspect('dossierIdsSuivisParInstructeurActuel', dossierIdsSuivisParInstructeurActuel)


    const trisActivitéPrincipale = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "activité_principale") }, id: 'ActivitéPrincipale-AZ' },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "activité_principale").reverse()}, id: 'ActivitéPrincipale-ZA' },
    ]

    const trisNomProjet = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "nom") }, id: 'NomProjet-AZ' },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "nom").reverse() }, id: 'NomProjet-ZA' },
    ]

    const trisLocalisation = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "localisation") }, id: 'Localisation-AZ' },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "localisation").reverse() }, id: 'Localisation-ZA' },
    ]

    const trisPorteurDeProjet = [
        { nom: "Trier de A à Z", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "porteur de projet") }, id: 'PorteurDeProjet-AZ' },
        { nom: "Trier de Z à A", trier(){ dossiersSelectionnés = trierDossiersParOrdreAlphabétiqueColonne(dossiersSelectionnés, "porteur de projet").reverse() }, id: 'PorteurDeProjet-ZA' },
    ]

    const triPriorisationPhaseProchaineAction = [
        { nom: "Prioriser", trier(){ dossiersSelectionnés = trierDossiersParPhaseProchaineAction(dossiersSelectionnés) }, id: 'Priorisation-PhaseAction' }
    ]
    
    /** @type {TriTableau[]} */
    const tris = [
        ...trisActivitéPrincipale,
        ...trisNomProjet,
        ...trisLocalisation,
        ...trisPorteurDeProjet,
        ...triPriorisationPhaseProchaineAction
    ]

    // Cette ligne doit être tolérante à ce que triIdSélectionné soit undefined ou n'importe quoi
    /** @type {TriTableau | undefined} */
    let triSélectionné = $state(tris.find(t => t.id === triIdSélectionné) || triPriorisationPhaseProchaineAction[0])


    /** @type {Map<'phase' | 'prochaine action attendue de' | 'texte' | 'suivis' | 'instructeurs' | 'activité principale', (d: DossierRésumé) => boolean>} */
    const tousLesFiltres = new SvelteMap()

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
    const phaseOptions = new SvelteSet([...phases])

    /** @type {Set<DossierPhase>} */
    let phasesSélectionnées = $state(filtresSélectionnés.phases ? 
        new SvelteSet(filtresSélectionnés.phases) :
        new SvelteSet([
            'Accompagnement amont',
            'Étude recevabilité DDEP',
            'Instruction'
        ]))

    //$inspect(phasesSélectionnées)

    /**
     *
     * @param {DossierPhase} phase
     */
    function makeTagPhaseOnClick(phase){
        return () => {
            console.log('click on phase', phase)

            if(phasesSélectionnées.has(phase)){
                phasesSélectionnées.delete(phase)
            }
            else{
                phasesSélectionnées.add(phase)
            }

            //phasesSélectionnées = phasesSélectionnées; // re-render

            filtrerDossiers()
        }
    }

    tousLesFiltres.set('phase', dossier => {
        return phasesSélectionnées.has(dossier.phase)
    })


    const PROCHAINE_ACTION_ATTENDUE_PAR_VIDE = '(vide)'
    const prochainesActionsAttenduesParOptions = new SvelteSet([...prochaineActionAttenduePar, PROCHAINE_ACTION_ATTENDUE_PAR_VIDE])

    /** @type {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} */
    // @ts-ignore
    let prochainesActionsAttenduesParSélectionnés = $state(filtresSélectionnés['prochaine action attendue de'] ?
        new SvelteSet(filtresSélectionnés['prochaine action attendue de']) :
        new SvelteSet(prochainesActionsAttenduesParOptions))

    tousLesFiltres.set("prochaine action attendue de", dossier => {
        if (!dossier.prochaine_action_attendue_par || !prochainesActionsAttenduesParOptions.has(dossier.prochaine_action_attendue_par)) {
            return prochainesActionsAttenduesParSélectionnés.has(PROCHAINE_ACTION_ATTENDUE_PAR_VIDE)
        }

        // @ts-ignore
        return prochainesActionsAttenduesParSélectionnés.has(dossier.prochaine_action_attendue_par)
    })

    /**
     *
     * @param {Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>} _prochainesActionsAttenduesParSélectionnés
     */
    function filtrerParProchainesActionsAttenduesPar(_prochainesActionsAttenduesParSélectionnés) {
        prochainesActionsAttenduesParSélectionnés = new SvelteSet(_prochainesActionsAttenduesParSélectionnés)
        
        filtrerDossiers()
    }

    let prochainesActionsAttenduesParNonSélectionnés = $derived(prochainesActionsAttenduesParOptions.difference(prochainesActionsAttenduesParSélectionnés))


    let texteÀChercher = $state(filtresSélectionnés.texte)

    /**
     * @param {string} _texteÀChercher
     */
    function ajouterFiltreTexte(_texteÀChercher) {
        texteÀChercher = _texteÀChercher.trim()

        // cf. https://github.com/MihaiValentin/lunr-languages/issues/66
        // lunr.fr n'indexe pas les chiffres. On gère donc la recherche sur
        // les nombres avec une fonction séparée.
        if (texteÀChercher.match(/\d[\dA-Za-z\-]*/)) {
            tousLesFiltres.set('texte', dossier => {
                const {
                    id,
                    départements,
                    communes,
                    number_demarches_simplifiées,
                    historique_identifiant_demande_onagre,
                } = dossier
                const communesCodes = communes?.map(({postalCode}) => postalCode).filter(c => c) || []

                return String(id) === texteÀChercher ||
                    départements?.includes(texteÀChercher || '') ||
                    communesCodes?.includes(texteÀChercher || '') ||
                    number_demarches_simplifiées === texteÀChercher ||
                    historique_identifiant_demande_onagre === texteÀChercher
            })
        } else {
            const texteSansAccents = retirerAccents(texteÀChercher)
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
    }

    /**
     * @param {string} _texteÀChercher
     */
    function filtrerParTexte(_texteÀChercher){
        ajouterFiltreTexte(_texteÀChercher)

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
    const instructeursOptions = new SvelteSet([email, AUCUN_INSTRUCTEUR, ...instructeurEmailOptions])

    //$inspect('')

    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} */
    let instructeursSélectionnés = $state(new SvelteSet(filtresSélectionnés.instructeurs ?
        filtresSélectionnés.instructeurs :
        instructeursOptions
    ))

    $inspect('instructeursSélectionnés', instructeursSélectionnés)

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
        instructeursSélectionnés = new SvelteSet(_instructeursSélectionnées)

		filtrerDossiers()
	}

    let instructeursNonSélectionnés = $derived(instructeursOptions.difference(instructeursSélectionnés))



    const AUCUNE_ACTIVITÉ_PRINCIPALE = '(aucune activité principale)'
    // @ts-ignore
    const activitésPrincipalesOptions = new SvelteSet([AUCUNE_ACTIVITÉ_PRINCIPALE, ...activitésPrincipales])

    /** @type {Set<DossierDemarcheSimplifiee88444["Activité principale"] | AUCUNE_ACTIVITÉ_PRINCIPALE>} */
    // @ts-ignore
    let activitésPrincipalesSélectionnées = $state(new SvelteSet(filtresSélectionnés.activitésPrincipales ?
        filtresSélectionnés.activitésPrincipales :
        activitésPrincipalesOptions
    ))

    tousLesFiltres.set('activité principale', dossier => {
        if(!dossier.activité_principale || !activitésPrincipalesOptions.has(dossier.activité_principale))
            return activitésPrincipalesSélectionnées.has(AUCUNE_ACTIVITÉ_PRINCIPALE)
        
        return activitésPrincipalesSélectionnées.has(dossier.activité_principale)
    })

    /**
     *
     * @param {Set<DossierDemarcheSimplifiee88444["Activité principale"]>} _activitésPrincipalesSélectionnées
     */
    function filtrerParActivitéPrincipale(_activitésPrincipalesSélectionnées) {
        activitésPrincipalesSélectionnées = new Set(_activitésPrincipalesSélectionnées)

		filtrerDossiers()
    }

    let activitésPrincipalesNonSélectionnées = $derived(activitésPrincipalesOptions.difference(activitésPrincipalesSélectionnées))

    $effect(() => {
        rememberTriFiltres(triSélectionné, {
            phases: phasesSélectionnées,
            'prochaine action attendue de': prochainesActionsAttenduesParSélectionnés,
            instructeurs: instructeursSélectionnés,
            activitésPrincipales: activitésPrincipalesSélectionnées,
            texte: texteÀChercher
        })
    });


    
    // Pagination du tableau de suivi
    /** @typedef {() => void} SelectionneurPage */

    const NOMBRE_DOSSIERS_PAR_PAGE = 20

    // numéro de page qui correspond à celui affiché, donc commençant à 1
    /** @type {number} */
    let numéroPageSelectionnée = $state(1)

    /** @type {[undefined, ...rest: SelectionneurPage[]] | undefined} */
    let selectionneursPage = $derived.by(() => {
        if(dossiersSelectionnés.length >= NOMBRE_DOSSIERS_PAR_PAGE*2 + 1){
            const nombreDePages = Math.ceil(dossiersSelectionnés.length/NOMBRE_DOSSIERS_PAR_PAGE)

            return [
                undefined,
                ...[...Array(nombreDePages).keys()].map(i => () => {
                    console.log('sélection de la page', i+1)
                    numéroPageSelectionnée = i+1
                })
            ]
        }
        
        return undefined
    });

    $effect(() => {
        if(selectionneursPage)
            numéroPageSelectionnée = 1
    })

    /** @type {typeof dossiersSelectionnés} */
    let dossiersAffichés = $derived.by(() => {
        if(!selectionneursPage)
            return dossiersSelectionnés
        else{
            return dossiersSelectionnés.slice(
                NOMBRE_DOSSIERS_PAR_PAGE*(numéroPageSelectionnée-1),
                NOMBRE_DOSSIERS_PAR_PAGE*numéroPageSelectionnée
            )
        }
    })

    //$inspect('dossiersAffichés', dossiersAffichés)


    // filtrage avec les filtres initiaux
    onMount(async () => {        
        if(texteÀChercher){
            ajouterFiltreTexte(texteÀChercher)
        }

        filtrerDossiers()
	});



    /**
     * 
     * @param {Dossier['id']} id
     */
    function instructeurActuelSuitDossier(id) {
        return instructeurSuitDossier(email, id)
    }

    /**
     * 
     * @param {Dossier['id']} id
     */
    function instructeurActuelLaisseDossier(id) {
        return instructeurLaisseDossier(email, id)
    }

    
</script>

<Squelette {email} {erreurs} {résultatsSynchronisationDS88444}>
    <div class="fr-grid-row fr-mt-4w fr-grid-row--center">
        <div class="fr-col">

            <h1>Tableau de suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr></h1>

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
                        options={activitésPrincipalesOptions}
                        optionsSélectionnées={activitésPrincipalesSélectionnées}
                        mettreÀJourOptionsSélectionnées={filtrerParActivitéPrincipale}
                    />
                    <FiltreParmiOptions
                        titre="Filtrer par prochaine action attendue par"
                        options={prochainesActionsAttenduesParOptions}
                        optionsSélectionnées={prochainesActionsAttenduesParSélectionnés}
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
                    <div class="fr-mb-1w">
                        <span>Dossiers suivis par&nbsp;:</span>
                        {#if instructeursNonSélectionnés.size === 0}
                            <strong>Toustes</strong>
                        {:else if instructeursNonSélectionnés.size === 1 && instructeursNonSélectionnés.has(AUCUN_INSTRUCTEUR)}
                            <strong>Au moins un.e instructeur.rice</strong>
                        {:else if instructeursNonSélectionnés.size <= 2}
                            <strong>Toustes sauf</strong>
                            {#each [...instructeursNonSélectionnés] as instructeur}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {instructeur}
                                    {#if instructeur === email}(moi){/if}
                                </span>
                            {/each}
                        {:else}
                            {#each [...instructeursSélectionnés] as instructeur}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {instructeur}
                                    {#if instructeur === email}(moi){/if}
                                </span>
                            {/each}
                        {/if}

                        {#if instructeursSélectionnés.size !== 1 || !instructeursSélectionnés.has(email)}
                            <button class="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-todo-line"
                                onclick={() => filtrerParInstructeurs(new Set([email]))}>
                                Suivi par moi
                            </button>
                        {/if}
                    </div>

                    <div class="fr-mb-1w">
                        <span>Prochaine action attendue par&nbsp;:</span>
                        {#if prochainesActionsAttenduesParNonSélectionnés.size === 0}
                            <strong>Toutes options</strong>
                        {:else if prochainesActionsAttenduesParNonSélectionnés.size <= 2}
                            <strong>Toutes options sauf</strong>
                            {#each [...prochainesActionsAttenduesParNonSélectionnés] as prochaineActionAttenduePar}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {prochaineActionAttenduePar}
                                </span>
                            {/each}
                        {:else}
                            {#each [...prochainesActionsAttenduesParSélectionnés] as prochaineActionAttenduePar}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {prochaineActionAttenduePar}
                                </span>
                            {/each}
                        {/if}
                    </div>
                    
                    <div class="fr-mb-1w">
                        <span>Activités principales&nbsp;:</span>
                        {#if activitésPrincipalesNonSélectionnées.size === 0}
                            <strong>Toutes</strong>
                        {:else if activitésPrincipalesNonSélectionnées.size <= 4}
                            <strong>Toutes sauf</strong>
                            {#each [...activitésPrincipalesNonSélectionnées] as activitéPrincipale}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {activitéPrincipale}
                                </span>
                            {/each}
                        {:else}
                            {#each [...activitésPrincipalesSélectionnées] as activitéPrincipale}
                                <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">
                                    {activitéPrincipale}
                                </span>
                            {/each}
                        {/if}
                    </div>
                    
                    {#if texteÀChercher}
                        <div class="fr-mb-1w">
                            <span class="fr-tag fr-tag--sm fr-mr-1w fr-mb-1v">Texte cherché : {texteÀChercher}</span>
                            <button onclick={onSupprimerFiltreTexte}>✖</button>
                        </div>
                    {/if}
                </section>

                <h2 class="fr-mt-2w">{dossiersSelectionnés.length}<small>/{dossiers.length}</small> dossiers sélectionnés</h2>

                <div class="fr-table fr-table--bordered">
                    <table class="fr-mb-2w">
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
                                        tris={trisPorteurDeProjet}
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
                            {#each dossiersAffichés as dossier (dossier)}
                            {@const { id, nom, 
                                communes, départements, régions,
                                activité_principale, rattaché_au_régime_ae,
                                enjeu_politique, enjeu_écologique, commentaire_libre,
                                phase, prochaine_action_attendue_par } = dossier}
                                <tr>
                                    <td>
                                        <a class="fr-btn voir-le-dossier fr-btn--sm fr-btn--icon-left fr-icon-eye-line fr-mb-1w" href={`/dossier/${id}`}>Voir le dossier</a>

                                        {#if commentaire_libre && commentaire_libre.trim().length >= 1}
                                            <BoutonModale id={`dsfr-modale-${id}`} >
                                                {#snippet boutonOuvrirDétails()}
                                                    Commentaire
                                                {/snippet}
                                                {#snippet contenu()}
                                                    <header class="titre-modale">
                                                        <h1 class="fr-modal__title">
                                                            Commentaire dossier {nom}
                                                        </h1>
                                                        <h2 class="fr-modal__title">
                                                            {formatPorteurDeProjet(dossier)}
                                                            &nbsp;-&nbsp;
                                                            {formatLocalisation({communes, départements, régions})}
                                                        </h2>
                                                    </header>
                            
                                                    <div class="contenu-modale">
                                                        {commentaire_libre}
                                                    </div>
                                                {/snippet}
                                                
                                            </BoutonModale>
                                        {/if}

                                        {#if dossierIdsSuivisParInstructeurActuel.has(id)}
                                            <button onclick={() => instructeurActuelLaisseDossier(id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left">Ne plus suivre</button>
                                        {:else}
                                            <button onclick={() => instructeurActuelSuitDossier(id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left" >Suivre</button>
                                        {/if}

                                    </td>
                                    <td>{formatLocalisation({communes, départements, régions})}</td>
                                    <td>{activité_principale || ''}</td>
                                    <td>{formatPorteurDeProjet(dossier)}</td>
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
                                        {rattaché_au_régime_ae === null ? 'Non renseigné' : rattaché_au_régime_ae ? "oui" : "non"}
                                    </td>
                                    <td>
                                        <TagPhase {phase} taille='SM'></TagPhase>
                                        <IndicateurDélaiPhase {dossier}></IndicateurDélaiPhase>
                                        {#if prochaine_action_attendue_par}
                                            <p class="fr-tag fr-tag--sm fr-mt-1w">{prochaine_action_attendue_par}</p>
                                        {/if}
                                    </td>
                                </tr>
                            {/each}
                        </tbody>

                    </table>

                    {#if selectionneursPage}
                    <Pagination {selectionneursPage} pageActuelle={selectionneursPage[numéroPageSelectionnée]}></Pagination>
                    {/if}
                </div>
            {:else}
                <div class="fr-mb-5w">
                    Il n'y a pas encore de dossiers associés à votre groupe instructeurs.
                    <br>
                    Vous pouvez <a href="https://www.demarches-simplifiees.fr/commencer/derogation-especes-protegees">créer des dossiers sur démarches simplifiées</a>.
                    Et répondre un département correspondant à votre département ou région à la question 
                    "Dans quel département se localise majoritairement votre projet ?"
                    <br>
                    Le dossier sera alors visible ici après 10-15 minutes d'attente maximum
                </div>
                
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

    .voir-le-dossier{
        white-space: pre;
    }

    .titre-modale{
        h1{
            margin-bottom: 0.8rem;
        }
        h2{
            margin-bottom: 0.6rem;
            font-size: 1.1rem;
        }
    }

    .contenu-modale{
        white-space: preserve;
    }
</style>
