<script>
    //@ts-check

    import TagPhase from '../TagPhase.svelte'
    import TransitionDePhase from './TransitionDePhase.svelte'
    import {formatDateRelative, formatDateAbsolue, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet, DossierPhase} from '../../../types/API_Pitchou' */    
    
    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

    $: phaseActuelle = dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase || 'Accompagnement amont';
    
    /** @type {Pick<DossierComplet, 'prochaine_action_attendue_par'> & {phase: DossierPhase}} */
    let dossierParams = {
        phase: phaseActuelle,
        prochaine_action_attendue_par: dossier.prochaine_action_attendue_par,
    }

    $: dossierParams.phase = phaseActuelle


    let messageErreur = "" 
    let afficherMessageSucces = false

    /**
     * 
     * @param {Event} e
     */
    const mettreAJourDossier = (e) => {
        e.preventDefault()

        /** @type {Partial<DossierComplet>} */
        const modifs = {}

        if(phaseActuelle !== dossierParams.phase){
            modifs.évènementsPhase = [
                {
                    dossier: dossier.id,
                    horodatage: new Date(),
                    phase: dossierParams.phase,
                    cause_personne: null, // sera rempli côté serveur avec le bon PersonneId
                    DS_emailAgentTraitant: null,
                    DS_motivation: null
                }
            ]
        }
        
        if(dossier.prochaine_action_attendue_par !== dossierParams.prochaine_action_attendue_par){
            modifs.prochaine_action_attendue_par = dossierParams.prochaine_action_attendue_par
        }

        modifierDossier(dossier, modifs)
            .then(() => afficherMessageSucces = true)
            .catch((error) => {
                console.info(error)
                messageErreur = "Quelque chose s'est mal passé du côté serveur."
            })
    }

    const retirerAlert = () => { 
        messageErreur = ""
        afficherMessageSucces = false
    }


</script>

<section class="row">

    <section>
        <h2>Historique</h2>
        <ol>
        {#each dossier.évènementsPhase as {phase, horodatage}}
            <li>
                <TagPhase phase={phase}></TagPhase>
                - 
                <span title={formatDateAbsolue(horodatage)}>{formatDateRelative(horodatage)}</span>
            </li>    
        {/each}
            <li>
                <TagPhase phase="Accompagnement amont"></TagPhase>
                -
                <strong>Dépôt dossier</strong>
                -
                <span title={formatDateAbsolue(dossier.date_dépôt)}>{formatDateRelative(dossier.date_dépôt)}</span>
        </ol>
    </section>

    <section>
        <h2>Annotations privées</h2>

        <a class="fr-btn fr-btn--secondary fr-mb-6w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées sur Démarches Simplifiées</a>

        <TransitionDePhase {dossier}></TransitionDePhase>


        <h2>Action attendue</h2>
        
        <form class=" fr-mb-4w" on:submit={mettreAJourDossier} on:change={retirerAlert}>
            {#if messageErreur}
                <div class="fr-alert fr-alert--error fr-mb-3w">
                    <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
                    <p>{messageErreur}</p>
                </div>
            {/if}
            {#if afficherMessageSucces}
            <div class="fr-alert fr-alert--success fr-mb-3w">
                <p>La phase et de qui est attendu la prochaine action ont été mises à jour !</p>
            </div>
            {/if}

            
            <div class="fr-input-group">
                <label class="fr-label" for="prochaine_action_attendue_par">
                    Prochaine action attendue de&nbsp;:
                </label>
        
                <select bind:value={dossierParams["prochaine_action_attendue_par"]} class="fr-select" id="prochaine_action_attendue_par">
                    {#each [...prochaineActionAttenduePar] as acteur}
                        <option value={acteur}>{acteur}</option>
                    {/each}
                </select>
            </div>
            <button class="fr-btn" type="submit">Mettre à jour</button>
        </form>

    </section>

</section>

<style lang="scss">
    .row{
        display: flex;
        flex-direction: row;

        &>:nth-child(1){
            flex: 3;
        }

        &>:nth-child(2){
            flex: 2;
        }
    }

    section{
        margin-bottom: 2rem;
    }

    ol{
        list-style: none;
        margin-top: 0;
        padding-left: 0;
        
        li{
            &::marker{
                content: none;
            }
        }

    }

</style>
