<script>
    //@ts-check

    import Squelette from '../Squelette.svelte'
    
    import {formatLocalisation, formatDéposant, phases, prochaineActionAttendue, prochaineActionAttenduePar} from '../../affichageDossier.js'
    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet, DossierPhaseEtProchaineAction} from '../../../types.js' */

    /** @type {DossierComplet} */
    export let dossier

    /** @type {string | undefined} */
    export let email

    const {number_demarches_simplifiées: numdos} = dossier

    /** @type {DossierPhaseEtProchaineAction} */
     let dossierParams = {
        phase: dossier.phase,
        prochaine_action_attendue: dossier.prochaine_action_attendue,
        prochaine_action_attendue_par: dossier.prochaine_action_attendue_par,
    }
    let messageErreur = "" 
    let afficherMessageSucces = false

    /**
     * 
     * @param {Event} e
     */
    const mettreAJourDossier = (e) => {
        e.preventDefault()

        modifierDossier(dossier.id, dossierParams)
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

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1 class="fr-mb-8w">Dossier {dossier.nom_dossier || "sans nom"}</h1>

            <nav class="dossier-nav fr-mb-2w">
                <ul class="fr-btns-group fr-btns-group--inline-lg">
                    <li> 
                        <a class="fr-btn fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}`}>Dossier sur Démarches Simplifiées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/annotations-privees`}>Annotations privées</a>
                    </li>
                    <li>
                        <a class="fr-btn fr-btn--secondary fr-my-0" target="_blank" href={`https://www.demarches-simplifiees.fr/procedures/88444/dossiers/${numdos}/messagerie`}>Messagerie</a>
                    </li>
                </ul>
            </nav>

            <article class="fr-p-3w fr-mb-4w">
                <section>
                    <h2 class="fr-h5">Phase et prochaine action attendue</h2>
                    
                    <form class=" fr-mb-4w" on:submit={mettreAJourDossier} on:change={retirerAlert}>
                        {#if messageErreur}
                            <div class="fr-alert fr-alert--error fr-mb-3w">
                                <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
                                <p>{messageErreur}</p>
                            </div>
                        {/if}
                        {#if afficherMessageSucces}
                        <div class="fr-alert fr-alert--success fr-mb-3w">
                            <p>La phase et la prochaine action attendue ont été mises à jour !</p>
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
                                Acteur(s) concerné(s)
                            </label>
                    
                            <select bind:value={dossierParams["prochaine_action_attendue_par"]} class="fr-select" id="prochaine_action_attendue_par">
                                {#each prochaineActionAttenduePar as acteur}
                                    <option value={acteur}>{acteur}</option>
                                {/each}
                            </select>
                        </div>
                        <div class="fr-input-group">
                            <label class="fr-label" for="prochaine_action_attendue">
                                Action
                            </label>
                    
                            <select bind:value={dossierParams["prochaine_action_attendue"]} class="fr-select" id="prochaine_action_attendue">
                                {#each prochaineActionAttendue as action}
                                    <option value={action}>{action}</option>
                                {/each}
                            </select>
                        </div>
                        <button class="fr-btn" type="submit">
                            Mettre à jour la phase ou la prochaine action
                        </button>
                    </form>
                </section>
                <section>
                    <h2 class="fr-h5">Informations</h2>
                    <ul>
                        <li>
                            <strong>Porteur de projet</strong> : {formatDéposant(dossier)}<br />
                        </li>
                        <li>
                            <strong>Localisation</strong> : {formatLocalisation(dossier)}
                        </li>

                        {#if dossier.enjeu_politique || dossier.enjeu_écologique}
                            <li>
                                <strong>Enjeux</strong> : 
                                {#if dossier.enjeu_politique}
                                    <span class="fr-badge fr-badge--sm fr-badge--blue-ecume">
                                        Enjeu politique
                                    </span>
                                {/if}

                                {#if dossier.enjeu_écologique}
                                <span class="fr-badge fr-badge--sm fr-badge--green-emeraude">
                                    Enjeu écologique
                                </span>
                                {/if}
                            </li>
                        {/if}
                    </ul>
                </section>
            </article>
        </div>
    </div>
</Squelette>

<style lang="scss">
    article {
        background-color: var(--background-alt-grey);
    }

    section {
            margin-bottom: 3rem;
    }

    select {
        max-width: 90%;
    }

    nav.dossier-nav {
        display: flex;
        justify-content: flex-end;
    }
</style>
