<script>
    import { onMount } from 'svelte';
    //@ts-check
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
    
    /** @import {ComponentProps} from 'svelte' */
    /** @import {DossierDemarcheSimplifiee88444} from '../../../types/démarches-simplifiées/DémarcheSimplifiée88444.ts'*/
    /** @import {DossierRésumé, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types/API_Pitchou.ts' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import {default as Personne} from '../../../types/database/public/Personne.ts' */
    /** @import { FiltresLocalStorage, TriTableau } from '../../../types/interfaceUtilisateur.ts' */

    /** @type {NonNullable<ComponentProps<Squelette>['email']>} */
    export let email;
    
    /** @type {ComponentProps<Squelette>['erreurs']} */
    export let erreurs;

    /** @type {ComponentProps<Squelette>['résultatsSynchronisationDS88444']} */
    export let résultatsSynchronisationDS88444;

    /** @type {DossierRésumé[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {DossierDemarcheSimplifiee88444["Activité principale"][] | undefined} */
    export let activitésPrincipales = undefined

    /** @type {TriTableau['id'] | undefined} */
    export let triIdSélectionné = undefined;

    /** @type {Partial<FiltresLocalStorage>} */
    export let filtresSélectionnés = {};

    export let rememberTriFiltres;

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

    //$: dossiersNonSélectionnés = (new Set(dossiers)).difference(new Set(dossiersSelectionnés))
    //$: console.log('dossiersNonSélectionnés', dossiersNonSélectionnés)
    //$: dossierNonSel = [...dossiersNonSélectionnés][0]
    //$: dossierNonSel && console.log('dossier non sélectionné', dossierNonSel, dossierNonSel.activité_principale, dossierNonSel.phase, dossierNonSel.prochaine_action_attendue_par)


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
    let triSélectionné = tris.find(t => t.id === triIdSélectionné) || triPriorisationPhaseProchaineAction[0]


    /** @type {Map<'phase' | 'prochaine action attendue de' | 'texte' | 'suivis' | 'instructeurs' | 'activité principale', (d: DossierRésumé) => boolean>} */
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
    let phasesSélectionnées = filtresSélectionnés.phases ? 
        new Set(filtresSélectionnés.phases) :
        new Set([
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
    let prochainesActionsAttenduesParSélectionnés = filtresSélectionnés['prochaine action attendue de'] ?
        new Set(filtresSélectionnés['prochaine action attendue de']) :
        new Set(prochainesActionsAttenduesParOptions)

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
        prochainesActionsAttenduesParSélectionnés = new Set(_prochainesActionsAttenduesParSélectionnés)
        
        filtrerDossiers()
    }

    $: prochainesActionsAttenduesParNonSélectionnés = prochainesActionsAttenduesParOptions.difference(prochainesActionsAttenduesParSélectionnés)


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
    let instructeursSélectionnés = new Set(filtresSélectionnés.instructeurs ?
        filtresSélectionnés.instructeurs :
        [email]
    )

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

    $: instructeursNonSélectionnés = instructeursOptions.difference(instructeursSélectionnés)



    const AUCUNE_ACTIVITÉ_PRINCIPALE = '(aucune activité principale)'
    // @ts-ignore
    const activitésPrincipalesOptions = new Set([AUCUNE_ACTIVITÉ_PRINCIPALE, ...activitésPrincipales])

    /** @type {Set<DossierDemarcheSimplifiee88444["Activité principale"] | AUCUNE_ACTIVITÉ_PRINCIPALE>} */
    // @ts-ignore
    let activitésPrincipalesSélectionnées = new Set(filtresSélectionnés.activitésPrincipales ?
        filtresSélectionnés.activitésPrincipales :
        activitésPrincipalesOptions
    )

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

    $: activitésPrincipalesNonSélectionnées = activitésPrincipalesOptions.difference(activitésPrincipalesSélectionnées)

    $: rememberTriFiltres(triSélectionné, {
        phases: phasesSélectionnées,
        'prochaine action attendue de': prochainesActionsAttenduesParSélectionnés,
        instructeurs: instructeursSélectionnés,
        activitésPrincipales: activitésPrincipalesSélectionnées
    })

    // filtrage avec les filtres initiaux
    onMount(async () => {
        filtrerDossiers()
	});

    
    // Pagination du tableau de suivi
    /** @typedef {() => void} SelectionneurPage */

    const NOMBRE_DOSSIERS_PAR_PAGE = 20

    /** @type {[undefined, ...rest: SelectionneurPage[]] | undefined} */
    let selectionneursPage;
    /** @type {SelectionneurPage | undefined} */
    let pageActuelle;
    /** @type {typeof dossiersSelectionnés} */
    let dossiersAffichés;


    $: {
        if(dossiersSelectionnés.length >= NOMBRE_DOSSIERS_PAR_PAGE*2 + 1){
            const nombreDePages = Math.ceil(dossiersSelectionnés.length/NOMBRE_DOSSIERS_PAR_PAGE)

            selectionneursPage = [
                undefined,
                ...Array(nombreDePages).fill(undefined).map((_, i) => function page(){
                    dossiersAffichés = dossiersSelectionnés.slice(NOMBRE_DOSSIERS_PAR_PAGE*i, NOMBRE_DOSSIERS_PAR_PAGE*(i+1))
                    // nerdisme JS : la page est représentée par la function qui la représente
                    // et on va chercher son nom ("page") qui représente une function distincte
                    // pour chaque tour du map
                    pageActuelle = page
                })
            ]

            // Sélectionner la première page
            selectionneursPage[1]()
        }
        else{
            dossiersAffichés = dossiersSelectionnés
            selectionneursPage = undefined
            pageActuelle = undefined
        }
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
                            <button on:click={onSupprimerFiltreTexte}>✖</button>
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
                                enjeu_politique, enjeu_écologique, commentaire_enjeu,
                                phase, prochaine_action_attendue_par } = dossier}
                                <tr>
                                    <td>
                                        <a class="fr-btn voir-le-dossier fr-btn--sm fr-btn--icon-left fr-icon-eye-line fr-mb-1w" href={`/dossier/${id}`}>Voir le dossier</a>

                                        {#if commentaire_enjeu && commentaire_enjeu.trim().length >= 1}
                                            <BoutonModale id={`dsfr-modale-${id}`}>
                                                <svelte:fragment slot="contenu-bouton">Commentaire</svelte:fragment>
                        
                                                <header class="titre-modale" slot="titre-modale">
                                                    <h1 class="fr-modal__title">
                                                        Commentaire dossier {nom}
                                                    </h1>
                                                    <h2 class="fr-modal__title">
                                                        {formatPorteurDeProjet(dossier)}
                                                        &nbsp;-&nbsp;
                                                        {formatLocalisation({communes, départements, régions})}
                                                    </h2>
                                                </header>
                        
                                                <div class="contenu-modale" slot="contenu-modale">
                                                    {commentaire_enjeu}
                                                </div>
                                            </BoutonModale>
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
                    <Pagination {selectionneursPage} {pageActuelle}></Pagination>
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
