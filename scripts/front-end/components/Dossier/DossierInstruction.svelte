<script>
    //@ts-check
    import debounce from "just-debounce-it";
    import TagPhase from '../TagPhase.svelte'
    import {formatDateRelative, formatDateAbsolue, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet} from '../../../types/API_Pitchou' */    
    
    /** @type {DossierComplet} */
    export let dossier

    const {number_demarches_simplifiées: numdos} = dossier

    $: phaseActuelle = dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase || 'Accompagnement amont';


    $: phase = phaseActuelle
    let commentaire_libre = dossier.commentaire_libre
    let prochaine_action_attendue_par = dossier.prochaine_action_attendue_par


    let messageErreur = "" 
    let afficherMessageSucces = false


    /** @type {((modifs: Partial<DossierComplet>) => void)} */
    const modifierChamp = (modifs) => {
        modifierDossier(dossier, modifs)
            .then(() => afficherMessageSucces = true)
            .catch((error) => {
                console.info(error)
                messageErreur = "Quelque chose s'est mal passé du côté serveur."
        })
    }

    const modifierChampAvecDebounce = debounce(modifierChamp, 1000)

    $: {
        /** @type {Partial<DossierComplet>} */
        const modifs = {}

        if(phaseActuelle !== phase){
            modifs.évènementsPhase = [
                {
                    dossier: dossier.id,
                    horodatage: new Date(),
                    phase: phase,
                    cause_personne: null, // sera rempli côté serveur avec le bon PersonneId
                    DS_emailAgentTraitant: null,
                    DS_motivation: null
                }
            ]
        }

        if (dossier.commentaire_libre !== commentaire_libre?.trim()) {
            modifs.commentaire_libre = commentaire_libre?.trim()
        }
        
        if(dossier.prochaine_action_attendue_par !== prochaine_action_attendue_par){
            modifs.prochaine_action_attendue_par = prochaine_action_attendue_par
        }

        if (Object.keys(modifs).length>=1){
            if (modifs.commentaire_libre) {
                modifierChampAvecDebounce(modifs)
            } else {
                modifierChamp(modifs)
            }
        }
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
        {#if messageErreur}
            <div class="fr-alert fr-alert--error fr-mb-3w">
                <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
                <p>{messageErreur}</p>
            </div>
        {/if}
        {#if afficherMessageSucces}
            <div class="fr-alert fr-alert--success fr-mb-3w">
                <p>Le dossier a bien été mis à jour.</p>
            </div>
        {/if}

        <div class="fr-input-group" id="input-group-commentaitre-libre">
            <strong><label class="fr-label" for="input-commentaire-libre"> Commentaire libre </label></strong>
            <textarea on:focus={retirerAlert} class="fr-input resize-vertical" aria-describedby="input-commentaire-libre-messages" id="input-commentaire-libre" bind:value={commentaire_libre} rows={8}></textarea>
            <div class="fr-messages-group" id="input-commentaire-libre-messages" aria-live="polite">
            </div>
        </div>

        <div class="fr-input-group">
            <label class="fr-label" for="phase">
                <strong>Phase du dossier</strong>
            </label>
            <select on:focus={retirerAlert} bind:value={phase} class="fr-select" id="phase">
                {#each [...phases] as phase}
                    <option value={phase}>{phase}</option>
                {/each}
            </select>
        </div>
        <div class="fr-input-group">
            <label class="fr-label" for="prochaine_action_attendue_par">
                <strong>Prochaine action attendue de</strong>
            </label>
    
            <select on:focus={retirerAlert} bind:value={prochaine_action_attendue_par} class="fr-select" id="prochaine_action_attendue_par">
                {#each [...prochaineActionAttenduePar] as acteur}
                    <option value={acteur}>{acteur}</option>
                {/each}
            </select>
        </div>


        <a target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées sur Démarches Simplifiées</a>

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

    .resize-vertical {
        resize: vertical
    }

</style>
