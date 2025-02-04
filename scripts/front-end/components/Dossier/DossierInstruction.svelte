<script>
    //@ts-check

    import TagPhase from '../TagPhase.svelte'
    import {formatDateRelative, formatDateAbsolue, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet, DossierPhase} from '../../../types/API_Pitchou' */    
    
    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

    $: phaseActuelle = dossier.évènementsPhase[0].phase;
    
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
                    cause_personne: null
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
    
<h2>Procédure</h2>

<section>
    <h3>Historique</h3>
    <ol>
    {#each dossier.évènementsPhase as {phase, horodatage}}
        <li>
            <TagPhase phase={phase}></TagPhase>
            - 
            <span title={formatDateAbsolue(horodatage)}>{formatDateRelative(horodatage)}</span>
        </li>    
    {/each}
        <li><strong>Dépôt dossier</strong> - <span title={formatDateAbsolue(dossier.date_dépôt)}>{formatDateRelative(dossier.date_dépôt)}</span>
    </ol>
</section>

<section>
    <h3>Instruction</h3>
    <h4>Phase et prochaine action attendue</h4>
    
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
            <label class="fr-label" for="phase">
                Phase du dossier
            </label>
    
            <select bind:value={dossierParams["phase"]} class="fr-select" id="phase">
                {#each [...phases] as phase}
                    <option value={phase}>{phase}</option>
                {/each}
            </select>
        </div>
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
        <button class="fr-btn" type="submit">
            Mettre à jour la phase ou de qui est attendu la prochaine action
        </button>
    </form>

    <h4>Autre</h4>
    <a class="fr-btn fr-btn--secondary fr-mb-1w" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées sur Démarches Simplifiées</a>

</section>


<style lang="scss">
    section{
        margin-bottom: 2rem;

        h3{
            margin-bottom: 1rem;
        }
    }

    ol{
        list-style: none;
        margin-top: 0;
        padding-left: 0;
        
        li{
            &:first-child{
                font-size: 1.5em;
                font-weight: bold;
                padding: 0.5em 0;
            }

            &::marker{
                content: none;
            }
        }

    }

</style>
