<script>
    import { run } from 'svelte/legacy';

    //@ts-check
    import debounce from "just-debounce-it";
    import TagPhase from '../TagPhase.svelte'
    import {formatDateRelative, formatDateAbsolue, phases, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';
    import { instructeurLaisseDossier, instructeurSuitDossier } from '../../actions/suiviDossier.js';
	import { originDémarcheNumérique } from '../../../commun/constantes.js'
    import ModaleAjouterPièceJointe from './ModaleAjouterPièceJointe.svelte'

    /** @import Personne from '../../../types/database/public/Personne.js' */
    /** @import {DossierComplet} from '../../../types/API_Pitchou' */
    /** @import Dossier from '../../../types/database/public/Dossier.ts' */
    /** @import {ComponentProps} from 'svelte' */
    /** @import Squelette from '../Squelette.svelte' */

    /**
     * @typedef {Object} Props
     * @property {DossierComplet} dossier
     * @property {NonNullable<Personne['email']>[]} personnesQuiSuiventDossier
     * @property {NonNullable<ComponentProps<typeof Squelette>['email']>} email
     * @property {boolean | undefined} dossierActuelSuiviParInstructeurActuel
     */

    /** @type {Props} */
    let { dossier, personnesQuiSuiventDossier, dossierActuelSuiviParInstructeurActuel, email } = $props();

    const idModaleAjouterPieceJointe = 'modale-ajouter-piece-jointe'

    const {number_demarches_simplifiées: numdos, numéro_démarche} = dossier

    let phaseActuelle = $derived(dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase || 'Accompagnement amont');

    let phase = $derived(phaseActuelle)
    let ddep_nécessaire = $state(dossier.ddep_nécessaire)
    let mesures_er_suffisantes = $state(dossier.mesures_er_suffisantes)
    let commentaire_libre = $state(dossier.commentaire_libre)
    let prochaine_action_attendue_par = $state(dossier.prochaine_action_attendue_par)

    /**
     * Convertit les deux champs ddep_nécessaire et mesures_er_suffisantes en une valeur composite pour le select
     * @returns {'oui' | 'non_sans_objet' | 'non_mesures_er_suffisantes' | 'a_determiner'}
     */
    function getDDEPValeurComposite() {
        if (ddep_nécessaire === true) {
            return 'oui'
        } else if (ddep_nécessaire === false) {
            if (mesures_er_suffisantes === false) {
                return 'non_sans_objet'
            } else if (mesures_er_suffisantes === true) {
                return 'non_mesures_er_suffisantes'
            } else {
                // Par défaut, si mesures_er_suffisantes est null et ddep_nécessaire est false, on considère que c'est "sans objet"
                return 'non_sans_objet'
            }
        } else {
            // ddep_nécessaire est null ou undefined
            return 'a_determiner'
        }
    }
    let ddepValeurComposite = $state(getDDEPValeurComposite())

    let messageErreur = $state("")
    let afficherMessageSucces = $state(false)


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

    run(() => {
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

        if(dossier.ddep_nécessaire !== ddep_nécessaire){
            modifs.ddep_nécessaire = ddep_nécessaire
        }

        if(dossier.mesures_er_suffisantes !== mesures_er_suffisantes){
            modifs.mesures_er_suffisantes = mesures_er_suffisantes
        }

        // Règle métier: mesures_er_suffisantes est toujours NULL si ddep_nécessaire est NULL
        if (ddep_nécessaire === null) {
            if (dossier.mesures_er_suffisantes !== null) {
                modifs.mesures_er_suffisantes = null
            }
        }

        if (Object.keys(modifs).length>=1){
            if (modifs.commentaire_libre) {
                modifierChampAvecDebounce(modifs)
            } else {
                modifierChamp(modifs)
            }
        }
    });

    const retirerAlert = () => {
        messageErreur = ""
        afficherMessageSucces = false
    }

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

    /**
     * Met à jour les deux champs ddep_nécessaire et mesures_er_suffisantes à partir de la valeur composite
     * @param {Event & {currentTarget: EventTarget & HTMLSelectElement; }} e
     * @returns {void}
     */
    function setDDEPValeurComposite(e) {
        const valeur = e.currentTarget.value
        if (valeur === 'oui') {
            ddep_nécessaire = true
            mesures_er_suffisantes = false
        } else if (valeur === 'non_sans_objet') {
            ddep_nécessaire = false
            mesures_er_suffisantes = false
        } else if (valeur === 'non_mesures_er_suffisantes') {
            ddep_nécessaire = false
            mesures_er_suffisantes = true
        } else if (valeur === 'a_determiner') {
            ddep_nécessaire = null
            mesures_er_suffisantes = null
        }
    }
</script>

<section class="row">

    <section>
        <div class="historique-entête">
            <h2 class="historique-titre">Historique</h2>
            <div class="historique-actions">
                <button 
                    type="button" 
                    class="fr-btn fr-btn--icon-left fr-icon-attachment-line" 
                    aria-controls={idModaleAjouterPieceJointe}
                    data-fr-opened="false"
                >
                    Ajouter une pièce jointe
                </button>
            </div>
        </div>
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
            </li>
        </ol>

        <h2 class="fr-mt-3w">Personnes qui suivent ce dossier</h2>
        {#if personnesQuiSuiventDossier.length >=1}
            <ul>
            {#each personnesQuiSuiventDossier as personneQuiSuitDossier}
                <li id={personneQuiSuitDossier}>{personneQuiSuitDossier}</li>
            {/each}
            </ul>
        {:else}
            <div class="col">
                <span>Personne ne suit ce dossier pour l'instant.</span>
                {#if typeof dossierActuelSuiviParInstructeurActuel === 'boolean'}
                    {#if dossierActuelSuiviParInstructeurActuel}
                        <button onclick={() => instructeurActuelLaisseDossier(dossier.id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-fill fr-btn--icon-left">Ne plus suivre</button>
                    {:else}
                        <button onclick={() => instructeurActuelSuitDossier(dossier.id)} class="fr-btn fr-btn--secondary fr-btn--sm fr-icon-star-line fr-btn--icon-left" >Suivre</button>
                    {/if}
                {/if}
            </div>
        {/if}

        <h2 class="fr-mt-3w">Dates de consultation du public ou enquête publique</h2>
        <ul>
            <li><strong>Date de début&nbsp;:&nbsp;</strong> <span title={formatDateAbsolue(dossier.date_debut_consultation_public ?? undefined)}>{dossier.date_debut_consultation_public ? formatDateRelative(dossier.date_debut_consultation_public) : 'Non renseignée'}</span></li>
            <li><strong>Date de fin&nbsp;:&nbsp;</strong> <span title={formatDateAbsolue(dossier.date_fin_consultation_public ?? undefined)}>{dossier.date_fin_consultation_public ? formatDateRelative(dossier.date_fin_consultation_public) : 'Non renseignée'}</span></li>
        </ul>

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
            <textarea onfocus={retirerAlert} class="fr-input resize-vertical" aria-describedby="input-commentaire-libre-messages" id="input-commentaire-libre" bind:value={commentaire_libre} rows={8}></textarea>
            <div class="fr-messages-group" id="input-commentaire-libre-messages" aria-live="polite">
            </div>
        </div>

        <div class="fr-input-group">
            <label class="fr-label" for="ddep-nécessaire">
                <strong>Une DDEP est-elle nécessaire ?</strong>
            </label>
            <select onfocus={retirerAlert} bind:value={ddepValeurComposite} onchange={setDDEPValeurComposite} class="fr-select" id="ddep-nécessaire">
                <option value="oui">Oui</option>
                <option value="non_mesures_er_suffisantes">Non, mesures Éviter, Réduire (ER) suffisantes</option>
                <option value="non_sans_objet">Non, sans objet</option>
                <option value="a_determiner">À déterminer</option>
            </select>
        </div>

        <div class="fr-input-group">
            <label class="fr-label" for="phase">
                <strong>Phase du dossier</strong>
            </label>
            <select onfocus={retirerAlert} bind:value={phase} class="fr-select" id="phase">
                {#each [...phases] as phase}
                    <option value={phase}>{phase}</option>
                {/each}
            </select>
        </div>
        <div class="fr-input-group">
            <label class="fr-label" for="prochaine_action_attendue_par">
                <strong>Prochaine action attendue de</strong>
            </label>

            <select onfocus={retirerAlert} bind:value={prochaine_action_attendue_par} class="fr-select" id="prochaine_action_attendue_par">
                {#each [...prochaineActionAttenduePar] as acteur}
                    <option value={acteur}>{acteur}</option>
                {/each}
            </select>
        </div>


        <a target="_blank" href={`${originDémarcheNumérique}/procedures/${numéro_démarche}/dossiers/${numdos}/annotations-privees`}>Annotations privées sur Démarche Numérique</a>

    </section>

</section>

<ModaleAjouterPièceJointe id={idModaleAjouterPieceJointe} {dossier} />

<style lang="scss">
    .row{
        display: flex;
        flex-direction: row;
        gap: 1rem;

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

    ol, ul{
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

    .col {
        display: flex;
        flex-direction: column;
    }

    .historique-entête {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .historique-titre {
        margin: 0;
    }

    .historique-actions {
        display: flex;
        gap: 0.5rem;
    }

</style>
