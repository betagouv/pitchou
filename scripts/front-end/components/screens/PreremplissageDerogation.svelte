<script>
    /** @import {DossierDemarcheSimplifiee88444} from "../../../types/démarches-simplifiées/DémarcheSimplifiée88444.js" */
    /** @import {SchemaDémarcheSimplifiée, Dossier88444ChampDescriptor} from '../../../types/démarches-simplifiées/schema.js' */
    import { créerLienGETPréremplissageDémarche } from '../../../commun/préremplissageDémarcheSimplifiée';
    import Squelette from '../Squelette.svelte'
    import CopyButton from '../CopyButton.svelte'

    /**
     * @param {string} label
     * @returns {string}
     */
     function labelToId(label) {
        return label.replace(/[^a-zA-Z0-9]+/g, '-')
    }

    /**
     * @typedef {Object} Props
     * @property {SchemaDémarcheSimplifiée} schemaDS88444
     * @property {string} [email]
     */

    /** @type {Props} */
    let { schemaDS88444, email = undefined } = $props();

    /** @type {Partial<DossierDemarcheSimplifiee88444>} */
    let nouveauDossierPartiel = $state({})
    let lienDePreremplissage = $state("")

    /** @type { (keyof DossierDemarcheSimplifiee88444)[] } */
    //@ts-expect-error svelte ne peut pas comprendre que les labels du schema sont les clefs de DossierDemarcheSimplifiee88444
    let champsPreremplis = $derived(Object.keys(nouveauDossierPartiel).filter(champ => {
        //@ts-expect-error pareil
        return nouveauDossierPartiel[champ] !== ""
    }))

    let onSelectChanged = () => {
        lienDePreremplissage = créerLienGETPréremplissageDémarche(nouveauDossierPartiel, schemaDS88444)
    }

    const champsPossibles = [
        "DropDownListChampDescriptor",
        "MultipleDropDownListChampDescriptor",
        "YesNoChampDescriptor",
        "CheckboxChampDescriptor",
        "HeaderSectionChampDescriptor",
    ]

    /** @type {Dossier88444ChampDescriptor[]} */
    //@ts-expect-error svelte ne peut pas comprendre que les labels du schema sont les clefs de DossierDemarcheSimplifiee88444
    let champsRemplissables = schemaDS88444["revision"]["champDescriptors"].filter((champ) => {
        return champsPossibles.includes(champ["__typename"])
    }).filter((champ, i, tableauActuel) => {
        if (champ["__typename"] === "HeaderSectionChampDescriptor") {
            const champSuivant = tableauActuel[i+1]

            if (!champSuivant) return champ["__typename"] !== "HeaderSectionChampDescriptor"

            if (champSuivant["__typename"] !== "HeaderSectionChampDescriptor") {
                return true
            } else {
                return false
            }
        } else {
            return true
        }
    })

    /** @type {(typeof groupe)[]} */
    let champsRemplissablesGroupés = []

    let groupe = {
        /** @type {string} */
        nom: 'Questions préliminaires',
        /** @type {Dossier88444ChampDescriptor[]} */
        champs: []
    }

    for (const champ of champsRemplissables) {
        if (champ['__typename'] === 'HeaderSectionChampDescriptor') {
            if (groupe.champs.length) {
                champsRemplissablesGroupés.push(groupe)
            }
            groupe = {
                nom: champ["label"],
                champs: []
            }
        } else {
            groupe.champs.push(champ)
        }
    }

</script>

<Squelette {email} title="Pré-remplissage dérogation">
    <div class="fr-grid-row fr-grid-row--center">
        <div class="fr-col-8">
            <h1>Pré-remplissage dérogation espèces protégées</h1>

            <form onchange={onSelectChanged}>
                {#each champsRemplissablesGroupés as groupe}
                    <fieldset class="fr-fieldset">
                        <legend class="fr-fieldset__legend--regular fr-fieldset__legend">
                            <h2>{groupe.nom}</h2>
                        </legend>
                        {#each groupe.champs as champ }
                            <div class="fr-fieldset__element">
                                <div class="fr-select-group">
                                    <label class="fr-label" for="{labelToId(champ["label"])}">
                                        {champ["label"]}
                                    </label>

                                    <select
                                        bind:value={nouveauDossierPartiel[champ["label"]]}
                                        id="{labelToId(champ["label"])}"
                                        class="fr-select"
                                    >

                                        <option value="" selected></option>
                                        {#if champ["options"]}
                                            {#each champ["options"] as option}
                                                <option value={option}>{option}</option>
                                            {/each}
                                        {:else}
                                            <option value={true}>Oui</option>
                                            <option value={false}>Non</option>
                                        {/if}
                                    </select>
                                </div>
                            </div>
                        {/each}
                    </fieldset>
                {/each}
            </form>

            <div class="fr-callout fr-callout--brown-caramel">
                <div class="fr-callout__text">
                    {#if champsPreremplis.length > 0}
                        <p class="fr-mt-2w">
                            La liste des éléments que vous avez pré-remplis avec ce lien :
                        </p>
                        <ul>
                            {#each champsPreremplis as champPrerempli}
                                <li>
                                    {champPrerempli} :
                                    <em>
                                        {#if typeof nouveauDossierPartiel[champPrerempli] === "boolean"}
                                            {nouveauDossierPartiel[champPrerempli] ? "Oui" : "Non"}
                                        {:else}
                                            {nouveauDossierPartiel[champPrerempli]}
                                        {/if}
                                    </em>
                                </li>
                            {/each}
                        </ul>

                        <CopyButton
                            classname="fr-btn fr-btn--lg copy-link"
                            textToCopy={() => lienDePreremplissage}
                            initialLabel="Copier le lien de pré-remplissage"
                        />

                        <a href={lienDePreremplissage} target="_blank">
                            Tester le lien de pré-remplissage
                        </a>
                    {:else}
                        <p class="fr-mt-2w">
                            Vous n'avez encore pré-rempli aucun champ de la dérogation. Vous pouvez sélectionner des options ci-dessus afin d'obtenir votre lien de pré-remplissage.
                        </p>
                    {/if}
                </div>
            </div>
        </div>

    </div>
</Squelette>
