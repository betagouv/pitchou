<script>
    /**
     * @typedef {Object} Props
     * @property {string} id
     * @property {() => void} [onFermeture]
     */
    
    /** @type {Props} */
    let { id, onFermeture } = $props();

    /**
     *  @typedef {'Arrêté préfectoral' | 'Avis expert' | 'Saisine expert' | 'Autre'} TypePièceJointe
    */

    /** @type {FileList | undefined} */
    let fileListPièceJointe = $state()

    /** @type {TypePièceJointe} */
    let typePièceJointe = $state('Autre')

    /** @type {string | null} */
    let serviceOuPersonneExperte = $state(null)

    /** @type {string | null} */
    let avisExpert = $state(null)

    function ajouterPièceJointe() {
        console.log('Ajouter une pièce jointe', {
            fichiers: fileListPièceJointe,
            typePièceJointe,
            serviceOuPersonneExperte,
            avisExpert
        })
        // TODO: Implémenter l'ajout de la pièce jointe
    }

    function fermerModale() {
        if (onFermeture) {
            onFermeture()
        }
    }
</script>

<dialog id={id} class="fr-modal" aria-labelledby="{id}-title">
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
                            <div class="fr-upload-group fr-mt-3w">
                                <label class="fr-label" for="upload-piece-jointe">
                                    Choisir un ou plusieurs fichiers
                                    <span class="fr-hint-text">
                                        Indication : taille maximale&nbsp;: 500 Mo. Formats supportés&nbsp;: xls, ods, pdf, odt. Plusieurs fichiers possibles.
                                    </span>
                                </label>
                                <input 
                                    accept=".xls,.ods,.pdf,.odt" 
                                    bind:files={fileListPièceJointe} 
                                    class="fr-upload" 
                                    aria-describedby="upload-piece-jointe-messages" 
                                    type="file" 
                                    id="upload-piece-jointe" 
                                    name="upload"
                                    multiple
                                />
                                <div class="fr-messages-group" id="upload-piece-jointe-messages" aria-live="polite">
                                </div>
                            </div>
                            <div class="fr-fieldset fr-mt-3w" id="champ-type-piece-jointe-group">
                                <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-type-piece-jointe-group"> Type de pièce jointe </legend>
                                <!-- {#each ['Arrêté préfectoral', 'Saisine expert', 'Avis expert', 'Autre'] as type} -->
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

                            {#if (typePièceJointe === 'Avis expert' || typePièceJointe === 'Saisine expert')}
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
                                                    />
                                                    <label class="fr-label" for={idRadio}>
                                                        {service}
                                                    </label>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                                <div class="fr-fieldset fr-mt-3w" id="champ-avis-expert-group">
                                    <legend class="fr-fieldset__legend--regular fr-fieldset__legend" id="champ-avis-expert-group"> Avis de l'expert </legend>
                                    <div class="conteneur-boutons-radios">
                                        {#each ['Favorable', 'Favorable sous condition', 'Défavorable'] as avis}
                                            {@const idRadio = `avis-expert-${avis.replace(/\s+/g, '-').toLowerCase()}-${id}`}
                                            <div class="fr-fieldset__element">
                                                <div class="fr-radio-group">
                                                    <input
                                                        type="radio"
                                                        id={idRadio}
                                                        name="avis-expert-{id}"
                                                        value={avis}
                                                        bind:group={avisExpert}
                                                    />
                                                    <label class="fr-label" for={idRadio}>
                                                        {avis}
                                                    </label>
                                                </div>
                                            </div>
                                        {/each}
                                    </div>
                                </div>
                            {/if}
                            <ul class="fr-btns-group fr-btns-group--right fr-btns-group--inline fr-mt-4w">
                                <li>
                                    <button type="button" class="fr-btn fr-btn--secondary" onclick={fermerModale}>Annuler</button>
                                </li>
                                <li>
                                    <button type="submit" class="fr-btn">Valider</button>
                                </li>
                            </ul>
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
</style>