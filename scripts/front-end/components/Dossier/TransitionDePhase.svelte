<script>
    /** @import {DossierComplet} from '../../../types/API_Pitchou' */

    import TagPhase from "../TagPhase.svelte";
    import Loader from "../Loader.svelte";
    import { modifierDossier } from '../../actions/dossier.js';


    /** @type {DossierComplet} */
    export let dossier;

    let phase =
        (dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase) ||
        "Accompagnement amont";

    let DDEPnécessaire = false;
    let dossierCompletEtRégulier = false;

    /** @type {undefined | Promise<any>} */
    let modificationEnCours = undefined;

    function passerÀPhaseÉtudeRecevabilité(){
        /** @type {Partial<DossierComplet>} */
        const modifs = {
            évènementsPhase : [
                {
                    dossier: dossier.id,
                    horodatage: new Date(),
                    phase: 'Étude recevabilité DDEP',
                    cause_personne: null, // sera rempli côté serveur avec le bon PersonneId
                    DS_emailAgentTraitant: null,
                    DS_motivation: null,
                }
            ]
        }

        modificationEnCours = modifierDossier(dossier, modifs)
    }



    /**
     *
     * @param {Event} e
     */
    const mettreAJourDossier = (e) => {
        e.preventDefault();

        /** @type {Partial<DossierComplet>} */
        const modifs = {};


        if (
            dossier.prochaine_action_attendue_par !==
            dossierParams.prochaine_action_attendue_par
        ) {
            modifs.prochaine_action_attendue_par =
                dossierParams.prochaine_action_attendue_par;
        }

        modifierDossier(dossier, modifs)
            .then(() => (afficherMessageSucces = true))
            .catch((error) => {
                console.info(error);
                messageErreur =
                    "Quelque chose s'est mal passé du côté serveur.";
            });
    };
</script>

<section class="fr-mb-2w">

    <h2>Transition de phase</h2>

    {#if phase === "Accompagnement amont"}
        <div class="fr-fieldset__element">
            <div class="fr-checkbox-group">
                <input
                    id="checkboxes-1"
                    type="checkbox"
                    bind:checked={DDEPnécessaire}
                />
                <label class="fr-label" for="checkboxes-1">
                    DDEP nécessaire
                </label>
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-checkbox-group">
                <input
                    id="checkboxes-2"
                    type="checkbox"
                    disabled={!DDEPnécessaire}
                    bind:checked={dossierCompletEtRégulier}
                />
                <label class="fr-label" for="checkboxes-2">
                    Dossier complet et régulier
                </label>
            </div>
        </div>

        {#if !DDEPnécessaire}
            <button class="fr-btn" disabled>
                Passer le dossier à ...
            </button>
        {:else if !dossierCompletEtRégulier}
            <button class="fr-btn" on:click={passerÀPhaseÉtudeRecevabilité}>
                Passer le dossier à <TagPhase phase="Étude recevabilité DDEP" taille="SM" classes={["fr-ml-1w"]}></TagPhase>
            </button>
            {#if modificationEnCours}
                {#await modificationEnCours}
                    <Loader></Loader>
                {:then}
                    ✅
                {:catch err}
                    <details>
                        <summary>❌ Une erreur est survenue. Réessayer plus tard</summary>
                        <div>
                            <strong>Informations techniques</strong>
                            <pre>{err}</pre>
                        </div>
                    </details>
                {/await}
            {/if}
        {:else}
            <button class="fr-btn">
                Passer le dossier à <TagPhase phase="Instruction" taille="SM" classes={["fr-ml-1w"]}></TagPhase>
            </button>
        {/if}

    {:else if phase === "Étude recevabilité DDEP"}
        Étude recevabilité DDEP
    {:else}
        bientôt...
    {/if}

</section>

<style lang="scss">
</style>
