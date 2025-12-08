<script>
	import { tick } from "svelte"
    /** @import Dossier from "../../../../types/database/public/Dossier.ts" */
    /** @import { FrontEndAvisExpert } from '../../../../types/API_Pitchou.js' */
    /** @import { AvisExpertInitializer, default as AvisExpert } from "../../../../types/database/public/AvisExpert.ts" */
    import { ajouterOuModifierAvisExpert } from "../../../actions/avisExpert.js"
	import { refreshDossierComplet } from "../../../actions/dossier.js"


    /**
     * @typedef {Object} Props
     * @property {Pick<Dossier, "id">} dossier
     * @property {() => void} fermerLeFormulaire
     * @property {FrontEndAvisExpert} [avisExpertInitial]
     */

    /** @type {Props} */
    let { fermerLeFormulaire, dossier, avisExpertInitial = $bindable() } = $props();

    /** @type {Partial<Pick<FrontEndAvisExpert, "id" | "expert" | "date_saisine" | "avis" | "date_avis">>} */
    let avisExpert = $state(avisExpertInitial ?? {})

    /** @type {FileList | undefined} */
    let fileListFichierSaisine = $state()

    /** @type {FileList | undefined} */ 
    let fileListFichierAvis = $state()

    /** @type {string | null} */
    let messageErreur = $state(null)

    /** @type {boolean} */
    let chargementAjouterOuModifierAvisExpert = $state(false);

    function réinitialiserFormulaire() {
        avisExpert = avisExpertInitial ?? {}
        fileListFichierSaisine = undefined
        fileListFichierAvis = undefined
        messageErreur = null
    }

    /**
     * 
     * @param {SubmitEvent} e
     */
    async function sauvegarderAvisExpert(e) {
        e.preventDefault()

        /** @type {Pick<AvisExpert, "dossier"> & AvisExpertInitializer | undefined} */
        let avisExpertÀAjouterOuModifier

        /** @type {File | undefined} */
        let fichierSaisine
        /** @type {File | undefined} */
        let fichierAvis


        if (fileListFichierSaisine && fileListFichierSaisine.length >= 1) {
            fichierSaisine = fileListFichierSaisine[0]
        }

        if (fileListFichierAvis && fileListFichierAvis.length >= 1) {
            fichierAvis = fileListFichierAvis[0]
        }

        if (avisExpertInitial?.id) {
            // Il s'agit d'une modification d'un avis expert
            avisExpertÀAjouterOuModifier = { id: avisExpertInitial.id, dossier: dossier.id, ...avisExpert }
        } else {
            // Il s'agit d'un ajout d'un avis expert
            avisExpertÀAjouterOuModifier = { dossier: dossier.id, ...avisExpert }
        }
        
        if (avisExpertÀAjouterOuModifier) {
            try {
                chargementAjouterOuModifierAvisExpert = true
                await ajouterOuModifierAvisExpert(avisExpertÀAjouterOuModifier, fichierSaisine, fichierAvis)
                await refreshDossierComplet(dossier.id)
                await tick() // permet de mettre à jour correctement les champs dans le cas d'une modification
                réinitialiserFormulaire()
                fermerLeFormulaire()
            } catch (e) {
                //@ts-ignore
                messageErreur = e.message 
            } finally {
                chargementAjouterOuModifierAvisExpert = false
            }

        }

        
    }
</script>

<form id="formulaire-ajouter-avis-expert" onsubmit="{sauvegarderAvisExpert}">
    <fieldset class="fr-fieldset" id="formulaire-ajouter-avis-expert-fieldset" aria-labelledby="formulaire-ajouter-avis-expert-fieldset-legend formulaire-ajouter-avis-expert-fieldset-messages">
        <legend class="fr-fieldset__legend" id="formulaire-ajouter-avis-expert-fieldset-legend">Ajouter un avis d'expert</legend>
        <div class="fr-fieldset__element">
        <div class="fr-input-group" id="champ-expert-group">
            <label class="fr-label" for="champ-expert">Expert</label>
            <input bind:value={avisExpert.expert} class="fr-input" aria-describedby="champ-expert-messages" name="input" id="champ-expert" type="text">
            <div class="fr-messages-group" id="champ-expert-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-upload-fichier-saisine-group">
            <label class="fr-label" for="upload-fichier-saisine">Fichier de la saisine
                <span class="fr-hint-text">Indication : 
                    Taille maximale&nbsp;: 15 Mo. 
                    Formats supportés&nbsp;: pdf</span>
            </label>
            <input accept=".pdf" bind:files="{fileListFichierSaisine}" class="fr-upload" aria-describedby="upload-fichier-saisine-messages" type="file" id="upload-fichier-saisine" name="upload">
            <div class="fr-messages-group" id="upload-fichier-saisine-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-date-saisine-group">
            <label class="fr-label" for="input-champ-date-saisine">Date saisine</label>
            <input bind:value={avisExpert.date_saisine} class="fr-input" aria-describedby="input-champ-date-saisine-messages" id="input-champ-date-saisine" type="date">
            <div class="fr-messages-group" id="input-champ-date-saisine-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-avis-group">
            <label class="fr-label" for="champ-avis">Avis</label>
            <input bind:value={avisExpert.avis} class="fr-input" aria-describedby="champ-avis-messages" name="input" id="champ-avis" type="text">
            <div class="fr-messages-group" id="champ-avis-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-upload-fichier-avis-group">
            <label class="fr-label" for="upload-fichier-avis">Fichier de l'avis de l'expert
                <span class="fr-hint-text">Indication : 
                    Taille maximale&nbsp;: 15 Mo. 
                    Formats supportés&nbsp;: pdf</span>
            </label>
            <input accept=".pdf" bind:files="{fileListFichierAvis}" class="fr-upload" aria-describedby="upload-fichier-avis-messages" type="file" id="upload-fichier-avis" name="upload">
            <div class="fr-messages-group" id="upload-fichier-avis-messages" aria-live="polite">
            </div>
        </div>
        <div class="fr-input-group" id="champ-date-avis-group">
            <label class="fr-label" for="input-champ-date-avis">Date avis</label>
            <input bind:value={avisExpert.date_avis} class="fr-input" aria-describedby="input-champ-date-avis-messages" id="input-champ-date-avis" type="date">
            <div class="fr-messages-group" id="input-champ-date-avis-messages" aria-live="polite">
            </div>
        </div>
        </div>
        <div class="fr-messages-group" id="formulaire-ajouter-avis-expert-fieldset-messages" aria-live="polite">
            {#if messageErreur}
                <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{messageErreur}</p>
                </div>
            {/if}
        </div>
        <ul class="fr-btns-group fr-btns-group--inline">
            <li>
                <button type="button" class="fr-btn fr-btn--secondary" onclick={fermerLeFormulaire}>Annuler</button>
            </li>
            <li>
                {#if chargementAjouterOuModifierAvisExpert}
                    <p aria-labelledby="sauvegarde-en-cours" class="fr-sr-only" role="alert">Sauvegarde en cours</p>
                    <button id="sauvegarde-en-cours" type="submit" class="fr-btn">Sauvegarde en cours...</button>
                {:else}
                    <button type="submit" class="fr-btn">Sauvegarder</button>
                {/if}
            </li>
        </ul>
    </fieldset>
</form>