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

    /** @type {Pick<AvisExpertInitializer, "expert" | "date_saisine" | "avis" | "date_avis">} */
    let avisExpertÀAjouter = $state({})

    /** @type {FileList | undefined} */
    let filesFichierSaisine = $state()

    /** @type {string | null} */
    let messageErreur = $state(null)


    /**
     * 
     * @param {SubmitEvent} e
     */
    async function ajouterAvisExpert(e) {
        e.preventDefault()
        console.log("click sur ajouter AvisExpert")
        /** @type { AvisExpertInitializer } */
        const nouvelAvisExpert = { dossier: dossier.id, ...avisExpertÀAjouter }

        /** @type {File | undefined} */
        let fichierSaisine

        if (filesFichierSaisine && filesFichierSaisine.length >= 1) {
            fichierSaisine = filesFichierSaisine[0]
        }

        try {
            await _ajouterAvisExpert(nouvelAvisExpert, fichierSaisine)
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
            <input bind:value={avisExpertÀAjouter.expert} class="fr-input" aria-describedby="champ-expert-messages" name="input" id="champ-expert" type="text">
            <div class="fr-messages-group" id="champ-expert-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-upload-fichier-saisine-group">
            <label class="fr-label" for="upload-fichier-saisine">Fichier de la saisine
                <span class="fr-hint-text">Indication : 
                    Taille maximale&nbsp;: 15 Mo. 
                    Formats supportés&nbsp;: pdf</span>
            </label>
            <input accept=".pdf" bind:files="{filesFichierSaisine}" class="fr-upload" aria-describedby="upload-fichier-saisine-messages" type="file" id="upload-fichier-saisine" name="upload">
            <div class="fr-messages-group" id="upload-fichier-saisine-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-date-saisine-group">
            <label class="fr-label" for="input-champ-date-saisine"> Date saisine </label>
            <input bind:value={avisExpertÀAjouter.date_saisine} class="fr-input" aria-describedby="input-champ-date-saisine-messages" id="input-champ-date-saisine" type="date">
            <div class="fr-messages-group" id="input-champ-date-saisine-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-avis-group">
            <label class="fr-label" for="champ-avis">Avis</label>
            <input bind:value={avisExpertÀAjouter.avis} class="fr-input" aria-describedby="champ-avis-messages" name="input" id="champ-avis" type="text">
            <div class="fr-messages-group" id="champ-avis-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-date-avis-group">
            <label class="fr-label" for="input-champ-date-avis"> Date avis </label>
            <input bind:value={avisExpertÀAjouter.date_avis} class="fr-input" aria-describedby="input-champ-date-avis-messages" id="input-champ-date-avis" type="date">
            <div class="fr-messages-group" id="input-champ-date-avis-messages" aria-live="polite">
            </div>
        </div>
        </div>
        <div class="fr-messages-group" id="formulaire-ajouter-avis-expert-fieldset-messages" aria-live="polite">
            {#if messageErreur}
                <div class="fr-alert fr-alert--error fr-alert--sm">
                    <p>{messageErreur}</p>
                </div>
            {/if}
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
</form>