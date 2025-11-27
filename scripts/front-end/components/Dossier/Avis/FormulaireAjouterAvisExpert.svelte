<script>

    /** @import Dossier from "../../../../types/database/public/Dossier.ts" */
    /** @import { AvisExpertInitializer } from "../../../../types/database/public/AvisExpert" */
    import { ajouterAvisExpert as _ajouterAvisExpert } from "../../../actions/avisExpert"
	import { refreshDossierComplet } from "../../../actions/dossier.js"

    /**
     * @typedef {Object} Props
     * @property {Pick<Dossier, "id">} dossier
     * @property {() => void} onClickRetour
     */

    /** @type {Props} */
    let { onClickRetour, dossier } = $props();

    /** @type {AvisExpertInitializer['expert']}*/
    let expert = $state()

    /** @type {string | null} */
    let messageErreur = $state(null)


    /**
     * 
     * @param {SubmitEvent} e
     */
    async function ajouterAvisExpert(e) {
        e.preventDefault()

        /** @type { AvisExpertInitializer } */
        const nouvelAvisExpert = { dossier: dossier.id, expert: expert ?? '' }
        
        try {
            await _ajouterAvisExpert(nouvelAvisExpert)
            await refreshDossierComplet(dossier.id)
        } catch (e) {
            //@ts-ignore
            messageErreur = e.message 
        }
        
    }
</script>

<form id="formulaire-ajouter-avis-expert" onsubmit="{ajouterAvisExpert}">
    <fieldset class="fr-fieldset" id="formulaire-ajouter-avis-expert-fieldset" aria-labelledby="formulaire-ajouter-avis-expert-fieldset-legend formulaire-ajouter-avis-expert-fieldset-messages">
        <legend class="fr-fieldset__legend" id="formulaire-ajouter-avis-expert-fieldset-legend">Ajouter un avis d'expert</legend>
        <div class="fr-fieldset__element">
        <div class="fr-input-group" id="champ-expert-group">
            <label class="fr-label" for="champ-expert">Expert</label>
            <input bind:value={expert} class="fr-input" aria-describedby="champ-expert-messages" name="input" id="champ-expert" type="text">
            <div class="fr-messages-group" id="champ-expert-messages" aria-live="polite">
            </div>
        </div>
        </div>
        <div class="fr-messages-group" id="formulaire-ajouter-avis-expert-fieldset-messages" aria-live="polite">
        </div>
        <ul class="fr-btns-group fr-btns-group--inline">
            <li>
                <button type="button" class="fr-btn fr-btn--secondary" onclick={onClickRetour}>Annuler</button>
            </li>
            <li>
                <button type="submit" class="fr-btn">Sauvegarder</button>
            </li>
        </ul>
    </fieldset>
    {#if messageErreur}
        <div class="fr-alert fr-alert--error fr-alert--sm">
            <p>{messageErreur}</p>
        </div>
     {/if}
</form>