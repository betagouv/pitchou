<script>
    //@ts-check
    import Squelette from '../Squelette.svelte'
    import FiltreParmiOptions from '../FiltreParmiOptions.svelte'
    import FiltreRechercheTableau from '../FiltreRechercheTableau.svelte'
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'

    /** @import {DossierComplet, DossierPhase} from '../../../types.js' */

    /** @type {DossierComplet[]} */
    export let dossiers = []

    /** @type {string | undefined} */
    export let email

    /** @type {DossierComplet[]} */
    $: dossiersSelectionnés = dossiers

    /** @type {Map<'département' | 'commune' | 'phase' | 'prochaine action attendue de', (d: DossierComplet) => boolean>}*/
    const filtreParColonne = new Map()

    function filtrerDossiers(){
		let nouveauxDossiersSélectionnés = dossiers;

		for(const filtre of filtreParColonne.values()){
			nouveauxDossiersSélectionnés = nouveauxDossiersSélectionnés.filter(filtre)
		}

		dossiersSelectionnés = nouveauxDossiersSélectionnés;
	}

    const PHASE_VIDE = '(vide)'
    const phaseOptions = new Set([...phases, PHASE_VIDE])

    /** @type {Set<DossierPhase | PHASE_VIDE>} */
    $: phasesFiltrées = new Set()

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

    $: prochainesActionsAttenduesParFiltrées = []

    function filtrerParProchainesActionsAttenduesPar({detail: prochainesActionsAttenduesParSélectionnées}) {
        filtreParColonne.set("prochaine action attendue de", dossier => {
            if (
                (dossier.prochaine_action_attendue_par === "" || dossier.prochaine_action_attendue_par === undefined || dossier.prochaine_action_attendue_par === null) &&
                prochainesActionsAttenduesParSélectionnées.has("sans objet")
            ) {
                return true
            }

            return prochainesActionsAttenduesParSélectionnées.has(dossier.prochaine_action_attendue_par)
        })

        prochainesActionsAttenduesParFiltrées = [...prochainesActionsAttenduesParSélectionnées]

        filtrerDossiers()
    }

    function onSupprimerProchaineActionAttenduePar(e) {
        e.preventDefault()

        filtrerParProchainesActionsAttenduesPar({ detail: new Set(prochaineActionAttenduePar)})
    }

    $: communeFiltrée = "" 

    function filtrerParCommune({detail: communeSélectionnée}){
        filtreParColonne.set('commune', dossier => {
            if (!dossier.communes) return false

            return dossier.communes.find(({name, postalCode, code}) => {
                return name.includes(communeSélectionnée) || postalCode.includes(communeSélectionnée)
            })
        })

        communeFiltrée = communeSélectionnée

        filtrerDossiers()
    }

    function onSupprimerFiltreCommune(e) {
        e.preventDefault()
     
        filtreParColonne.delete('commune')
    }

    $: départementFiltré = ""

    function filtrerParDépartement({detail: départementSélectionné}){
        filtreParColonne.set('département', dossier => {
            if (!dossier.départements) return false

            return dossier.départements.find((département) => {
                return département.includes(départementSélectionné) 
            })
        })

        départementFiltré = départementSélectionné

        filtrerDossiers()
    }

    function onSupprimerFiltreDépartement(e) {
        e.preventDefault()
     
        filtreParColonne.delete('département')
    }
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w fr-grid-row--center">
        <div class="fr-col">

            <h1>Suivi instruction <abbr title="Demandes de Dérogation Espèces Protégées">DDEP</abbr></h1>

            <div class="filtres">
                <FiltreRechercheTableau
                    titre="Rechercher par commune"
                    on:selected-changed={filtrerParCommune}
                />
                <FiltreRechercheTableau
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
                    options={prochaineActionAttenduePar} 
                    on:selected-changed={filtrerParProchainesActionsAttenduesPar} 
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
                    {#if prochainesActionsAttenduesParFiltrées.length > 0}
                        <span class="fr-badge fr-badge--sm">Prochaine action attendue par : {prochainesActionsAttenduesParFiltrées.join(", ")}</span>
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
