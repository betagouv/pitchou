<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import FiltreTexte from '../FiltreTexte.svelte'
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'

    /** @import {DossierComplet, DossierPhase, DossierProchaineActionAttenduePar} from '../../../types.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    /** @type {string | undefined} */
    export let email

    /** @type {DossierComplet[]} */
    $: dossiersSelectionnés = dossiers

    /** @type {Map<'département' | 'commune' | 'phase' | 'prochaine action attendue de' | 'texte', (d: DossierComplet) => boolean>}*/
    const filtreParColonne = new Map()

    function filtrerDossiers(){
		let nouveauxDossiersSélectionnés = dossiers;

		for(const filtre of filtreParColonne.values()){
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
        filtreParColonne.set('phase', dossier => {
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
        filtreParColonne.set("prochaine action attendue de", dossier => {
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
        filtreParColonne.set('commune', dossier => {
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
     
        filtreParColonne.delete('commune')
        communeFiltrée = "" 
        filtrerDossiers()
    }

    $: départementFiltré = ""

    /**
     * @param {{detail: string}} _
     */
    function filtrerParDépartement({detail: départementSélectionné}){
        filtreParColonne.set('département', dossier => {
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
     
        filtreParColonne.delete('département')
        départementFiltré = "" 
        filtrerDossiers()
    }

    $: texteÀChercher = ''

    /**
     * @param {{detail: string}} _
     */
    function filtrerParTexte({detail: _texteÀChercher}){
        filtreParColonne.set('texte', dossier => {
            return Boolean(
                dossier.commentaire_enjeu && dossier.commentaire_enjeu.includes(_texteÀChercher) ||
                dossier.commentaire_libre && dossier.commentaire_libre.includes(_texteÀChercher) ||
                dossier.demandeur_personne_morale_raison_sociale && dossier.demandeur_personne_morale_raison_sociale.includes(_texteÀChercher) ||
                dossier.demandeur_personne_physique_nom && dossier.demandeur_personne_physique_nom.includes(_texteÀChercher) ||
                dossier.demandeur_personne_physique_prénoms && dossier.demandeur_personne_physique_prénoms.includes(_texteÀChercher) ||
                dossier.number_demarches_simplifiées && dossier.number_demarches_simplifiées.includes(_texteÀChercher) ||
                String(dossier.id || '').includes(_texteÀChercher) ||
                dossier.nom && dossier.nom.includes(_texteÀChercher) ||
                dossier.nom_dossier && dossier.nom_dossier.includes(_texteÀChercher)
            )
        })

        texteÀChercher = _texteÀChercher;

        filtrerDossiers()
    }

    /**
     * 
     * @param {Event} e
     */
    function onSupprimerFiltreTexte(e) {
        e.preventDefault()
     
        filtreParColonne.delete('texte')

        texteÀChercher = ''
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
                    {#if phasesFiltrées.size > 0}
                        <span class="fr-badge fr-badge--sm">Phases : {[...phasesFiltrées].join(", ")}</span>
                    {/if}
                    {#if prochainesActionsAttenduesParFiltrées.size > 0}
                        <span class="fr-badge fr-badge--sm">Prochaine action attendue par : {[...prochainesActionsAttenduesParFiltrées].join(", ")}</span>
                    {/if}
                    {#if texteÀChercher}
                        <span class="fr-badge fr-badge--sm">Texte cherché : {texteÀChercher}</span>
                        <button on:click={onSupprimerFiltreTexte}>✖</button>
                    {/if}
                </div>
            </div>
                

            <div class="fr-table fr-table--bordered">
                <table>
                    <thead>
                        <tr>
                            <th>Voir le dossier</th>
                            <th>Localisation</th>
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
                          enjeu_politique, enjeu_écologique,
                          rattaché_au_régime_ae, phase, prochaine_action_attendue, prochaine_action_attendue_par }}
                            <tr>
                                <td><a href={`/dossier/${id}`}>Voir le dossier</a></td>
                                <td>{formatLocalisation({communes, départements, régions})}</td>
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
                                <td>{phase || ""}</td>
                                <td>
                                    {#if prochaine_action_attendue_par}
                                        <strong>{prochaine_action_attendue_par}</strong> :
                                    {/if}
                                    {#if prochaine_action_attendue}
                                        <br />{prochaine_action_attendue}
                                    {/if}
                                </td>
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

    .fr-badge {
        white-space: nowrap;
    }

</style>
