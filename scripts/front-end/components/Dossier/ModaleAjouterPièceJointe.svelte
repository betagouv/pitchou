<script>
    import { tick } from "svelte"
    import { ajouterOuModifierAvisExpert } from "../../actions/avisExpert.js"
    import { refreshDossierComplet } from "../../actions/dossier.js"
    import { formatDateAbsolue } from "../../affichageDossier.js"
	import DateInput from "../common/DateInput.svelte"

    /** @import {DossierComplet, FrontEndAvisExpert} from '../../../types/API_Pitchou.js' */

    /**
     * @typedef {Object} Props
     * @property {string} id
     * @property {Pick<DossierComplet, 'id' | 'avisExpert'>} dossier
     */
    
    /** @type {Props} */
    let { id, dossier } = $props();

    /**
     *  @typedef {'Arrêté préfectoral' | 'Avis expert' | 'Saisine expert' | 'Autre'} TypePièceJointe
    */

    /** @type {FileList | undefined} */
    let fileListPièceJointe = $state()

    /** @type {TypePièceJointe | null} */
    let typePièceJointe = $state(null)

    /** @type {string | null} */
    let serviceOuPersonneExperte = $state(null)

    /** @type {string | null} */
    let autreExpertTexte = $state(null)

    /** @type {string | null} */
    // avis de l'expert (favorable, non favorable...)
    let avis = $state(null)

    /** @type {FrontEndAvisExpert['date_saisine'] | undefined}*/
    let dateSaisine = $state()

    /** @type {FrontEndAvisExpert['id'] | 'nouvel-avis-expert' | null} */
    let avisExpertSélectionné = $state(null)

    /** @type {string | null} */
    let messageErreur = $state(null)

    /** @type {HTMLElement | undefined} */
    let modale;

    /** @type {HTMLInputElement | undefined} */
    let fileInput =$state();

    /** @type {boolean} */
    let chargementEnCours = $state(false)

    let saisinesSansAvis = $derived(dossier.avisExpert.filter(ae => 
                (ae.date_saisine !== null || ae.saisine_fichier_url !== null) && 
                (ae.avis === null && ae.date_avis === null)
            )
    )

    // Pré-cocher automatiquement la saisine si il n'y en a qu'une seule
    $effect(() => {
        if (typePièceJointe === 'Avis expert' && saisinesSansAvis.length === 1 && avisExpertSélectionné === null) {
            avisExpertSélectionné = saisinesSansAvis[0].id
            serviceOuPersonneExperte = saisinesSansAvis[0].expert
        }
    })

    let formulaireValide = $derived(
        fileListPièceJointe && fileListPièceJointe.length > 0 && 
        typePièceJointe !== null && typePièceJointe !== undefined &&
        (
            (typePièceJointe === 'Saisine expert' && serviceOuPersonneExperte !== null && 
                // @ts-ignore ts ne comprend pas que autreExpertTexte peut être de type string
                (serviceOuPersonneExperte !== 'Autre expert' || (autreExpertTexte && autreExpertTexte.trim() !== ''))) ||
            (typePièceJointe === 'Avis expert' && avisExpertSélectionné !== null && avis !== null && 
                (avisExpertSélectionné === 'nouvel-avis-expert' 
                    // @ts-ignore ts ne comprend pas que autreExpertTexte peut être de type string
                    ? serviceOuPersonneExperte !== null && (serviceOuPersonneExperte !== 'Autre expert' || (autreExpertTexte !== null && autreExpertTexte.trim() !== ''))
                    : true))
        )
    )

    async function ajouterPièceJointe() {
        
        if (!fileListPièceJointe || fileListPièceJointe.length === 0) {
            return
        }

        try {
            chargementEnCours = true
            messageErreur = null

            if (typePièceJointe === 'Saisine expert') {
                // Créer un nouvel avis expert avec la saisine
                const fichierSaisine = fileListPièceJointe[0]
                const expert = serviceOuPersonneExperte === 'Autre expert' ? autreExpertTexte : serviceOuPersonneExperte
                const avisExpertÀCréer = {
                    dossier: dossier.id,
                    expert: expert,
                    date_saisine: new Date()
                }
                await ajouterOuModifierAvisExpert(avisExpertÀCréer, fichierSaisine, undefined)
                await refreshDossierComplet(dossier.id)
                await tick()
                // Fermer la modale après succès
                fermerModale()
            } else if (typePièceJointe === 'Avis expert') {
                // Soit modifier une saisine existante en ajoutant l'avis, soit créer un nouveau
                const fichierAvis = fileListPièceJointe[0]
                
                if (avisExpertSélectionné === 'nouvel-avis-expert') {
                    // Créer un nouvel avis expert
                    const expert = serviceOuPersonneExperte === 'Autre expert' ? autreExpertTexte : serviceOuPersonneExperte
                    /** @type {Pick<FrontEndAvisExpert, "dossier"> & Partial<FrontEndAvisExpert>}*/
                    const avisExpertÀCréer = {
                        dossier: dossier.id,
                        expert: expert,
                        avis,
                        date_saisine: dateSaisine,
                    }
                    await ajouterOuModifierAvisExpert(avisExpertÀCréer, undefined, fichierAvis)
                } else if (avisExpertSélectionné) {
                    // Ajouter l'avis à une saisine existante
                    const saisineExistant = dossier.avisExpert.find(ae => ae.id === avisExpertSélectionné)
                    if (saisineExistant) {
                        const avisExpertÀModifier = {
                            id: saisineExistant.id,
                            dossier: dossier.id,
                            expert: saisineExistant.expert,
                            avis,
                        }
                        await ajouterOuModifierAvisExpert(avisExpertÀModifier, undefined, fichierAvis)
                    }
                }
                await refreshDossierComplet(dossier.id)
                await tick()
                // Fermer la modale après succès
                fermerModale()
            }
        } catch (e) {
            // @ts-ignore
            messageErreur = e.message || "Une erreur est survenue"
        } finally {
            chargementEnCours = false
        }
    }

    function réinitialiserLeFormulaireSaufTypePièceJointe() {
        fileListPièceJointe = undefined
        if (fileInput) {
            fileInput.value = ''
        }
        serviceOuPersonneExperte = null
        autreExpertTexte = null
        avis = null
        dateSaisine = null;
        avisExpertSélectionné = null
        messageErreur = null
    }

    function fermerModale() {
        // Réinitialiser les états
        réinitialiserLeFormulaireSaufTypePièceJointe()
        typePièceJointe = null

        if (modale) {
            //@ts-ignore
            window.dsfr(modale).modal.conceal();
        }
    }
</script>

<dialog bind:this={modale} id={id} class="fr-modal" aria-labelledby="{id}-title">
    <div class="fr-container fr-container--fluid fr-container-md">
        <div class="fr-grid-row fr-grid-row--center">
            <div class="fr-col-12 fr-col-md-10 fr-col-lg-8">
                <div class="fr-modal__body">
                    <div class="fr-modal__header">
                        <button aria-controls={id} title="Fermer" type="button" class="fr-btn--close fr-btn" onclick={fermerModale}>Fermer</button>
                    </div>
                    <div class="fr-modal__content">
                        <h2 id="{id}-title" class="fr-modal__title">
                            Ajouter une pièce jointe
                        </h2>
                        <form onsubmit={(e) => { e.preventDefault(); ajouterPièceJointe(); }}>
                            <div class="fr-fieldset fr-mt-3w" id="champ-type-piece-jointe-group">
                                <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-type-piece-jointe-group"> Type de pièce jointe </legend>
                                    <div class="conteneur-boutons-radios">
                                        {#each ['Saisine expert', 'Avis expert'] as type}
                                            {@const idRadio = `type-piece-jointe-${type.replace(/\s+/g, '-').toLowerCase()}-${id}`}
                                            <div class="fr-fieldset__element">
                                                <div class="fr-radio-group">
                                                    <input
                                                        type="radio"
                                                        id={idRadio}
                                                        name="type-piece-jointe-{id}"
                                                        value={type}
                                                        onchange={() => réinitialiserLeFormulaireSaufTypePièceJointe() }
                                                        bind:group={typePièceJointe}
                                                    />
                                                    <label class="fr-label" for={idRadio}>
                                                        {type}
                                                    </label>
                                                </div>
                                            </div>
                                        {/each}
                                </div>
                            </div>
                            {#if typePièceJointe}
                                <div class="fr-upload-group fr-mt-3w">
                                    <label class="fr-label" for="upload-piece-jointe">
                                        {#if typePièceJointe === 'Avis expert' || typePièceJointe === 'Saisine expert'}
                                            Choisir un fichier
                                        {:else}
                                            Choisir un ou plusieurs fichiers
                                        {/if}
                                        <span class="fr-hint-text">
                                            Indication : taille maximale&nbsp;: 500 Mo. Formats supportés&nbsp;: xls, ods, pdf, odt. Plusieurs fichiers possibles.
                                        </span>
                                    </label>
                                    <input 
                                        bind:this={fileInput}
                                        accept=".xls,.ods,.pdf,.odt" 
                                        bind:files={fileListPièceJointe} 
                                        class="fr-upload" 
                                        aria-describedby="upload-piece-jointe-messages" 
                                        type="file" 
                                        id="upload-piece-jointe" 
                                        name="upload"
                                        multiple={typePièceJointe !== 'Avis expert' && typePièceJointe !== 'Saisine expert'}
                                    />
                                    <div class="fr-messages-group" id="upload-piece-jointe-messages" aria-live="polite">
                                    </div>
                                </div>
                            {/if}
                            {#if fileListPièceJointe && fileListPièceJointe.length > 0}
                                {#if typePièceJointe === 'Saisine expert'}
                                    <div class="fr-mt-3w">
                                        <label class="fr-input-group fr-label" for="modale-date-saisine-{id}">Date de la saisine</label>
                                        <DateInput id={`modale-date-saisine-${id}`} bind:date={dateSaisine} />
                                    </div>
                                    <div class="fr-fieldset fr-mt-3w" id="champ-service-expert-group">
                                        <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-service-expert-group"> Service ou personne experte </legend>
                                        <div class="conteneur-boutons-radios">
                                            {#each ['CSRPN', 'CNPN', 'Ministre', 'Autre expert'] as service}
                                                {@const idRadio = `service-expert-${service.replace(/\s+/g, '-').toLowerCase()}-${id}`}
                                                <div class="fr-fieldset__element">
                                                    <div class="fr-radio-group">
                                                        <input
                                                            type="radio"
                                                            id={idRadio}
                                                            name="service-expert-{id}"
                                                            value={service}
                                                            bind:group={serviceOuPersonneExperte}
                                                            onchange={() => { if (service !== 'Autre expert') autreExpertTexte = null }}
                                                        />
                                                        <label class="fr-label" for={idRadio}>
                                                            {service}
                                                        </label>
                                                    </div>
                                                </div>
                                            {/each}
                                        </div>
                                    </div>
                                    {#if serviceOuPersonneExperte === 'Autre expert'}
                                        <div class="fr-input-group fr-mt-3w">
                                            <label class="fr-label" for="autre-expert-texte-{id}">Précisez l'expert</label>
                                            <input 
                                                class="fr-input" 
                                                type="text" 
                                                id="autre-expert-texte-{id}" 
                                                bind:value={autreExpertTexte}
                                                placeholder="Nom de l'expert"
                                            />
                                        </div>
                                    {/if}
                                {/if}
                                
                                {#if typePièceJointe === 'Avis expert'}
                                    {@const idRadioNouvel = `avis-expert-selection-nouvel-${id}`}
                                    <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-selection-group">
                                        <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-avis-expert-selection-group"> Sélectionner une saisine </legend>
                                        <div class="conteneur-boutons-radios-vertical">
                                            {#if saisinesSansAvis.length > 0}
                                                {#each saisinesSansAvis as saisine}
                                                    {@const idRadio = `avis-expert-selection-${saisine.id}-${id}`}
                                                    <div class="fr-fieldset__element">
                                                        <div class="fr-radio-group">
                                                            <input
                                                                type="radio"
                                                                id={idRadio}
                                                                name="avis-expert-selection-{id}"
                                                                value={saisine.id}
                                                                bind:group={avisExpertSélectionné}
                                                                onchange={() => serviceOuPersonneExperte = saisine.expert}
                                                            />
                                                            <label class="fr-label" for={idRadio}>
                                                                Saisine {saisine.expert || 'Expert'}{saisine.date_saisine ? ` - ${formatDateAbsolue(saisine.date_saisine)}` : ''}
                                                            </label>
                                                        </div>
                                                    </div>
                                                {/each}
                                            {/if}
                                            <div class="fr-fieldset__element">
                                                <div class="fr-radio-group">
                                                    <input
                                                        type="radio"
                                                        id={idRadioNouvel}
                                                        name="avis-expert-selection-{id}"
                                                        value="nouvel-avis-expert"
                                                        bind:group={avisExpertSélectionné}
                                                        onchange={() => { avis = null; serviceOuPersonneExperte = null; }}
                                                    />
                                                    <label class="fr-label" for={idRadioNouvel}>
                                                        Nouvel avis expert
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {#if avisExpertSélectionné === 'nouvel-avis-expert'}
                                        <div class="fr-fieldset fr-mt-3w" id="champ-service-expert-group">
                                            <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-service-expert-group"> Service ou personne experte </legend>
                                            <div class="conteneur-boutons-radios">
                                                {#each ['CSRPN', 'CNPN', 'Autre expert'] as service}
                                                    {@const idRadio = `service-expert-${service.replace(/\s+/g, '-').toLowerCase()}-${id}`}
                                                    <div class="fr-fieldset__element">
                                                        <div class="fr-radio-group">
                                                            <input
                                                                type="radio"
                                                                id={idRadio}
                                                                name="service-expert-{id}"
                                                                value={service}
                                                                bind:group={serviceOuPersonneExperte}
                                                                onchange={() => { if (service !== 'Autre expert') autreExpertTexte = null }}
                                                            />
                                                            <label class="fr-label" for={idRadio}>
                                                                {service}
                                                            </label>
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                        {#if serviceOuPersonneExperte === 'Autre expert'}
                                            <div class="fr-input-group fr-mt-3w">
                                                <label class="fr-label" for="autre-expert-texte-avis-{id}">Précisez l'expert</label>
                                                <input 
                                                    class="fr-input" 
                                                    type="text" 
                                                    id="autre-expert-texte-avis-{id}" 
                                                    bind:value={autreExpertTexte}
                                                    placeholder="Nom de l'expert"
                                                />
                                            </div>
                                        {/if}
                                    {/if}

                                    {#if avisExpertSélectionné}
                                        <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-group">
                                            <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-avis-expert-group"> Avis de l'expert </legend>
                                            <div class="">
                                                {#each ['Avis favorable', 'Avis favorable tacite', 'Avis favorable sous condition', 'Avis défavorable'] as avisOption}
                                                    {@const idRadio = `avis-expert-${avisOption.replace(/\s+/g, '-').toLowerCase()}-${id}`}
                                                    <div class="fr-fieldset__element">
                                                        <div class="fr-radio-group">
                                                            <input
                                                                type="radio"
                                                                id={idRadio}
                                                                name="avis-expert-{id}"
                                                                value={avisOption}
                                                                bind:group={avis}
                                                            />
                                                            <label class="fr-label" for={idRadio}>
                                                                {avisOption}
                                                            </label>
                                                        </div>
                                                    </div>
                                                {/each}
                                            </div>
                                        </div>
                                    {/if}
                                {/if}

                                {#if messageErreur}
                                    <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-3w">
                                        <p>{messageErreur}</p>
                                    </div>
                                {/if}
                                {#if formulaireValide}
                                    <ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline">
                                        <li>
                                            {#if chargementEnCours}
                                                <button type="submit" class="fr-btn" disabled>Sauvegarde en cours...</button>
                                            {:else}
                                                <button type="submit" class="fr-btn">Valider</button>
                                            {/if}
                                        </li>
                                    </ul>
                                {/if}
                            {/if}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
</dialog>


<style>
    .conteneur-boutons-radios {
        width: 100%;
        display: flex;
        flex-direction: row;
    }

    .fr-fieldset__element {
        flex: unset;
    }

    .conteneur-boutons-radios-vertical {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }
</style>