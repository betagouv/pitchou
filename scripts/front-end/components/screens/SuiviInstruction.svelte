<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import FiltreTexte from '../FiltreTexte.svelte'
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import {contientTexteDansDossier, créerIndexDossiers} from '../../rechercherDansDossier.js'
    import {retirerAccents} from '../../../commun/manipulationStrings.js'

    /** @import {DossierComplet, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types.js' */
    /** @import {PitchouState} from '../../store.js' */
    /** @import {default as Personne} from '../../../types/database/public/Personne.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    /** @type {PitchouState['relationSuivis']} */
    export let relationSuivis

    /** @type {string | undefined} */
    export let email

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

    /** @type {DossierComplet[]} */
    $: dossiersSelectionnés = dossiers
    //$: console.log('dossiersSelectionnés', dossiersSelectionnés)

    /** @type {Map<'département' | 'commune' | 'phase' | 'prochaine action attendue de' | 'texte' | 'suivis' | 'instructeurs', (d: DossierComplet) => boolean>}*/
    const tousLesFiltres = new Map()

    function filtrerDossiers(){
		let nouveauxDossiersSélectionnés = dossiers;

		for(const filtre of tousLesFiltres.values()){
			nouveauxDossiersSélectionnés = nouveauxDossiersSélectionnés.filter(filtre)
		}

		dossiersSelectionnés = nouveauxDossiersSélectionnés;
	}


    const PHASE_VIDE = '(vide)'
    /** @type {Set<NonNullable<DossierPhase> | PHASE_VIDE>}*/
    const phaseOptions = new Set([...phases, PHASE_VIDE])

    /** @type {Set<DossierPhase | PHASE_VIDE>} */
    // @ts-ignore
    $: phasesFiltrées = new Set()

    /**
     * 
     * @param {{detail: Set<DossierPhase | PHASE_VIDE>}} _
     */
	function filtrerParPhase({detail: phasesSélectionnées}){
        tousLesFiltres.set('phase', dossier => {
            if (phasesSélectionnées.has(PHASE_VIDE)) {
                return !dossier.phase
            }

            return phasesSélectionnées.has(dossier.phase)
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
     * @param {{detail: Set<DossierProchaineActionAttenduePar | PROCHAINE_ACTION_ATTENDUE_PAR_VIDE>}} _
     */
    function filtrerParProchainesActionsAttenduesPar({detail: prochainesActionsAttenduesParSélectionnées}) {
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

    $: communeFiltrée = "" 

    /**
     * @param {{detail: string}} _
     */
    function filtrerParCommune({detail: communeSélectionnée}){
        tousLesFiltres.set('commune', dossier => {
            if (!dossier.communes) return false

            return !!dossier.communes.find(({name, postalCode}) => {
                return name.includes(communeSélectionnée) || postalCode.includes(communeSélectionnée)
            })
        })

        communeFiltrée = communeSélectionnée

        filtrerDossiers()
    }

    /**
     * 
     * @param {Event} e
     */
    function onSupprimerFiltreCommune(e) {
        e.preventDefault()
     
        tousLesFiltres.delete('commune')
        communeFiltrée = "" 
        filtrerDossiers()
    }

    $: départementFiltré = ""

    /**
     * @param {{detail: string}} _
     */
    function filtrerParDépartement({detail: départementSélectionné}){
        tousLesFiltres.set('département', dossier => {
            if (!dossier.départements) return false

            return !!dossier.départements.find((département) => {
                return département.includes(départementSélectionné) 
            })
        })

        départementFiltré = départementSélectionné

        filtrerDossiers()
    }

    /**
     * 
     * @param {Event} e
     */
    function onSupprimerFiltreDépartement(e) {
        e.preventDefault()
     
        tousLesFiltres.delete('département')
        départementFiltré = "" 
        filtrerDossiers()
    }

    $: texteÀChercher = ''
    const dossiersIndex = créerIndexDossiers(dossiers)

    /**
     * @param {{detail: string}} _
     */
    function filtrerParTexte({detail: _texteÀChercher}){
        // cf. https://github.com/MihaiValentin/lunr-languages/issues/66
        // lunr.fr n'indexe pas les chiffres. On gère donc la recherche sur 
        // les nombres avec une fonction séparée.
        if (_texteÀChercher.match(/(\d+[A-Za-z\-]*)+/)) {
            tousLesFiltres.set('texte', dossier => {
                const {
                    id, 
                    départements, 
                    communes, 
                    number_demarches_simplifiées,
                    historique_identifiant_demande_onagre,
                } = dossier
                const communesCodes = communes?.map(({postalCode}) => postalCode).filter(c => c) || []
            
                return String(id)?.includes(_texteÀChercher) ||
                    départements?.includes(_texteÀChercher) || 
                    communesCodes?.includes(_texteÀChercher) ||
                    number_demarches_simplifiées?.includes(_texteÀChercher) || 
                    historique_identifiant_demande_onagre?.includes(_texteÀChercher) || 
                    false
            })
        } else {
            tousLesFiltres.set('texte', dossier => {
                const texteSansAccents = retirerAccents(_texteÀChercher)
                // Pour chercher les communes qui contiennent des tirets avec lunr,
                // on a besoin de passer la chaîne de caractères entre "".
                const aRechercher = texteSansAccents.match(/(\w+-)+/) ? 
                    `"${texteSansAccents}"` :
                    texteSansAccents
                return contientTexteDansDossier(
                    aRechercher, 
                    dossier, 
                    dossiersIndex,
                )
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
    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>}*/
    const instructeursOptions = new Set(relationSuivis && relationSuivis.keys())
    instructeursOptions.add(AUCUN_INSTRUCTEUR)

    /** @type {Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>} */
    $: instructeursSélectionnés = new Set()

    /**
     * 
     * @param {{detail: Set<NonNullable<Personne['email']> | AUCUN_INSTRUCTEUR>}} _
     */
	function filtrerParInstructeurs({detail: _instructeursSélectionnées}){
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

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <div class="fr-col">

            <h1>Suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr></h1>

            <div class="filtres">
                <FiltreTexte
                    titre="Rechercher par commune"
                    on:selected-changed={filtrerParCommune}
                />
                <FiltreTexte
                    titre="Rechercher par département"
                    on:selected-changed={filtrerParDépartement}
                />
                <FiltreParmiOptions 
                    titre="Filtrer par phase"
                    options={phaseOptions} 
                    on:selected-changed={filtrerParPhase} 
                />
                <FiltreParmiOptions 
                    titre="Filtrer par prochaine action attendue par"
                    options={prochainesActionsAttenduesParOptions} 
                    on:selected-changed={filtrerParProchainesActionsAttenduesPar} 
                />
                <FiltreTexte
                    titre="Rechercher texte libre"
                    on:selected-changed={filtrerParTexte}
                />
                {#if instructeursOptions && instructeursOptions.size >= 2}
                <FiltreParmiOptions 
                    titre="Filtrer par instructeur suivant le dossier"
                    options={instructeursOptions} 
                    on:selected-changed={filtrerParInstructeurs} 
                />
                {/if}
                {#if dossiersIdSuivisParInstructeurActuel && dossiersIdSuivisParInstructeurActuel.size >= 1}
                <div class="fr-checkbox-group">
                    <input bind:checked={filtrerUniquementDossiersSuivi} name="checkbox-1" id="checkbox-1" type="checkbox">
                    <label class="fr-label" for="checkbox-1">
                        Afficher uniquement mes dossiers suivis
                    </label>
                </div>
                {/if}

                <div class="fr-mt-2w">
                    {#if communeFiltrée}
                        <div class="fr-badge fr-badge--sm">
                            Commune : {communeFiltrée}
                            <button on:click={onSupprimerFiltreCommune}>✖</button>
                        </div>
                    {/if}
                    {#if départementFiltré}
                        <div class="fr-badge fr-badge--sm">
                            Département : {départementFiltré}
                            <button on:click={onSupprimerFiltreDépartement}>✖</button>
                        </div>
                    {/if}
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
            </div>
                
            <h2>{dossiersSelectionnés.length} dossiers affichés</h2>

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
                          phase, prochaine_action_attendue_par }}
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
                                <td>{phase || ''}</td>
                                <td>{prochaine_action_attendue_par || ''}</td>
                            </tr>
                        {/each}
                    </tbody>

                </table>
            </div>
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

    .fr-badge:not(.instructeurs) {
        white-space: nowrap;
    }

</style>
