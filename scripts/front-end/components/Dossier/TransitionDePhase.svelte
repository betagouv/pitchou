<script>
    /** @import {DossierComplet} from '../../../types/API_Pitchou' */

    import {
        formatLocalisation,
        formatPorteurDeProjet,
    } from "../../affichageDossier.js";
    import { afficherString } from "../../affichageValeurs.js";
    import TagPhase from "../TagPhase.svelte";
    import BoutonModale from "../DSFR/BoutonModale.svelte";

    /** @type {DossierComplet} */
    export let dossier;

    let phase =
        (dossier.évènementsPhase[0] && dossier.évènementsPhase[0].phase) ||
        "Accompagnement amont";

    let DDEPnécessaire = false;
    let dossierCompletEtRégulier = false;


    /**
     *
     * @param {Event} e
     */
    const mettreAJourDossier = (e) => {
        e.preventDefault();

        /** @type {Partial<DossierComplet>} */
        const modifs = {};

        if (phaseActuelle !== dossierParams.phase) {
            modifs.évènementsPhase = [
                {
                    dossier: dossier.id,
                    horodatage: new Date(),
                    phase: dossierParams.phase,
                    cause_personne: null, // sera rempli côté serveur avec le bon PersonneId
                    DS_emailAgentTraitant: null,
                    DS_motivation: null,
                },
            ];
        }

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
            <button class="fr-btn">
                Passer le dossier à <TagPhase phase="Étude recevabilité DDEP" taille="SM" classes={["fr-ml-1w"]}></TagPhase>
            </button>
        {:else}
            <button class="fr-btn">
                Passer le dossier à <TagPhase phase="Instruction" taille="SM" classes={["fr-ml-1w"]}></TagPhase>
            </button>
        {/if}


        
    {:else}
        <div class="fr-input-group">
            <label class="fr-label" for="phase"> Phase du dossier </label>

            <select bind:value={phase} class="fr-select" id="phase">
                {#each [...phases] as phase}
                    <option value={phase}>{phase}</option>
                {/each}
            </select>
        </div>
    {/if}

</section>

<style lang="scss">
</style>
