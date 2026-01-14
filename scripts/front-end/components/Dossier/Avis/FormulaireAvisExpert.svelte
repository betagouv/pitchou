<script>
	import { tick } from "svelte"
    /** @import { DossierComplet, FrontEndAvisExpert } from '../../../../types/API_Pitchou.js' */

    import { ajouterOuModifierAvisExpert } from "../../../actions/avisExpert.js"
	import { refreshDossierComplet } from "../../../actions/dossier.js"
	import DateInput from "../../common/DateInput.svelte"

    /**
     * @typedef {Object} Props
     * @property {DossierComplet['id']} dossierId
     * @property {() => void} fermerLeFormulaire
     * @property {FrontEndAvisExpert} [avisExpertInitial]
     */

    /** @type {Props} */
    let { fermerLeFormulaire, dossierId, avisExpertInitial = $bindable() } = $props();

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

    /**
     * 
     * @param {SubmitEvent} e
     */
    async function sauvegarderAvisExpert(e) {
        e.preventDefault()

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

        const avisExpertÀAjouterOuModifier = avisExpertInitial?.id ? { id: avisExpertInitial.id, dossier: dossierId, ...avisExpert } : { dossier: dossierId, ...avisExpert }
        
        if (avisExpertÀAjouterOuModifier) {
            try {
                chargementAjouterOuModifierAvisExpert = true
                await ajouterOuModifierAvisExpert(avisExpertÀAjouterOuModifier, fichierSaisine, fichierAvis)
                await refreshDossierComplet(dossierId)
                await tick() // Permet de mettre à jour correctement les champs dans le cas d'une modification
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
                <input bind:value={avisExpert.expert} class="fr-input" aria-describedby="champ-expert-messages" id="champ-expert" name="champ-expert" type="text" placeholder="Nom de l'expert">
                <div class="fr-messages-group" id="champ-expert-messages" aria-live="polite">
                </div>
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-upload-fichier-avis-group">
                <label class="fr-label" for="upload-fichier-avis">Fichier de l'avis de l'expert
                    <span class="fr-hint-text">Indication : 
                        Taille maximale&nbsp;: 20 Mo. 
                        Formats supportés&nbsp;: pdf</span>
                </label>
                {#if avisExpertInitial?.avis_fichier_url}
                    <a class="fr-btn fr-btn--secondary fr-btn--sm" href={avisExpertInitial.avis_fichier_url}>
                        Télécharger le fichier de l'avis
                    </a>
                {:else}
                    <input accept=".pdf" bind:files="{fileListFichierAvis}" class="fr-upload" aria-describedby="upload-fichier-avis-messages" type="file" id="upload-fichier-avis" name="upload">
                    <div class="fr-messages-group" id="upload-fichier-avis-messages" aria-live="polite">
                    </div>
                {/if}
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-input-group fr-mt-3w" id="champ-date-avis-group">
                <label class="fr-label" for="input-champ-date-avis">Date avis</label>
                <DateInput bind:date={avisExpert.date_avis}/>
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-upload-fichier-saisine-group">
                <label class="fr-label" for="upload-fichier-saisine">Fichier de la saisine
                    <span class="fr-hint-text">Indication : 
                        Taille maximale&nbsp;: 20 Mo. 
                        Formats supportés&nbsp;: pdf</span>
                </label>
                {#if avisExpertInitial?.saisine_fichier_url}
                    <a class="fr-btn fr-btn--secondary fr-btn--sm" href={avisExpertInitial.saisine_fichier_url}>
                        Télécharger le fichier de la saisine
                    </a>
                {:else}
                    <input accept=".pdf" bind:files="{fileListFichierSaisine}" class="fr-upload" aria-describedby="upload-fichier-saisine-messages" type="file" id="upload-fichier-saisine" name="upload">
                    <div class="fr-messages-group" id="upload-fichier-saisine-messages" aria-live="polite">
                    </div>
                {/if}
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-input-group fr-mt-3w" id="champ-date-saisine-group">
                <label class="fr-label" for="input-champ-date-saisine">Date saisine</label>
                <DateInput bind:date={avisExpert.date_saisine}/>
            </div>
        </div>
        <div class="fr-fieldset__element">
            <div class="fr-input-group" id="champ-avis-group">
                <p class="fr-label fr-mb-2w">Avis de l’expert</p>

                {#each ['Avis favorable', 'Avis favorable tacite', 'Avis favorable sous condition', 'Avis défavorable'] as value}
                    {@const id = `avis-${value.replace(/\s+/g, '-').toLowerCase()}`}

                    <div class="fr-radio-group">
                        <input
                            type="radio"
                            id={id}
                            name="champ-avis"
                            value={value}
                            bind:group={avisExpert.avis}
                        />
                        <label class="fr-label" for={id}>
                            {value}
                        </label>
                    </div>
                {/each}

                <div class="fr-messages-group" id="champ-avis-group-messages" aria-live="polite"></div>
            </div>
        </div>
        <div class="fr-messages-group" id="formulaire-ajouter-avis-expert-fieldset-messages" aria-live="polite">
            {#if messageErreur}
                <div class="fr-alert fr-alert--error fr-alert--sm fr-mb-2w">
                    <p>{messageErreur}</p>
                </div>
            {/if}
        </div>
        <ul style={'width: 100%;'} class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-4w">
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