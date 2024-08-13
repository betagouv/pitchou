 <script>
    //@ts-check
    import page from 'page'

    import Squelette from '../Squelette.svelte'

    import { modifierDossier } from '../../actions/dossier.js';

    /** @import {DossierComplet} from '../../../types.js' */
    /** @import {default as Dossier} from '../../../types/database/public/Dossier.ts' */

    /** @type {DossierComplet} */
    export let dossier
    export let email

    /** @type {Partial<Dossier>} */
    let dossierParams = {
        phase: dossier.phase,
        prochaine_action_attendue: dossier.prochaine_action_attendue,
        prochaine_action_attendue_par: dossier.prochaine_action_attendue_par,
    }
    const {number_demarches_simplifiées: numdos} = dossier
    let errorMessage = "" 

    const mettreAJourDossier = (e) => {
        e.preventDefault()

        modifierDossier(dossier.id, dossierParams)
            .then(() => page(`/dossier/${dossier.id}`))
            .catch((error) => {
                console.info(error)
                errorMessage = "Quelque chose s'est mal passé du côté serveur."
            })
    }

    const retirerErreur = () => errorMessage = ""

    const phases = [
        "accompagnement amont",
        "accompagnement amont terminé", 
        "instruction",
        "décision",
        "refus tacite",
    ]

   const prochaineActionAttenduePar = [
        "instructeur",
        "CNPN/CSRPN",
        "pétitionnaire",
        "consultation du public",
        "autre administration",
        "sans objet",
    ]

    const prochaineActionAttendue = [
        "traitement", 
        "lancement consultation", 
        "rédaction AP",
        "Avis",
        "DDEP",
        "complément dossier",
        "mémoire en réponse avis CNPN",
    ]
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-mt-6w">
        <div class="fr-col">
            <h1>Modifier le dossier</h1>
            <h2 class="fr-h3 fr-mb-8w">
                {dossier.nom_dossier || "sans nom"}
            </h2>


            <nav class="dossier-nav fr-mb-2w">
                <div>
                    <a class="fr-link fr-icon-arrow-left-line fr-link--icon-left" href="/dossier/{dossier.id}">
                        Retour au dossier
                    </a>
                </div>

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

            <form class="fr-p-3w fr-mb-4w" on:submit={mettreAJourDossier} on:change={retirerErreur}>
                <h3 class="fr-h4">Mettre à jour la prochaine action attendue</h3>
                {#if errorMessage}
                    <div class="fr-alert fr-alert--error fr-mb-3w">
                        <h3 class="fr-alert__title">Erreur lors de la mise à jour :</h3>
                        <p>{errorMessage}</p>
                    </div>
                {/if}
                <div class="fr-input-group">
                    <label class="fr-label" for="phase">
                        Phase du dossier
                    </label>
            
                    <select bind:value={dossierParams["phase"]} class="fr-select" id="phase">
                        {#each phases as phase}
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
                    Enregistrer
                </button>
            </form>
        </div>
    </div>
</Squelette>

<style lang="scss">
    form {
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
        justify-content: space-between;
        align-items: center;
    } 

    nav.fr-breadcrumb {
        margin-bottom: .5rem;
        margin-top: 0;
    }
</style>

