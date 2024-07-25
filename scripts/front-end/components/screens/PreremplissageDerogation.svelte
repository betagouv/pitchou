<script>
    import { créerLienGETPréremplissageDémarche } from '../../../commun/préremplissageDémarcheSimplifiée';
    import Squelette from '../Squelette.svelte'
    import CopyButton from '../CopyButton.svelte'

    /** @import {DossierDémarcheSimplifiée88444} from "../../../types.js" */

    export let schemaDS88444
    export let email

    /** @type {Partial<DossierDémarcheSimplifiée88444>} */
    let nouveauDossierPartiel = {}
    let lienDePreremplissage = ""
    
    /** @type {Array<DossierDémarcheSimplifiée88444[keyof DossierDémarcheSimplifiée88444]>} */
    $: champsPreremplis = Object.keys(nouveauDossierPartiel).filter(champ => {
        return nouveauDossierPartiel[champ] !== ""
    })

    let onSelectChanged = (e) => {
        lienDePreremplissage = créerLienGETPréremplissageDémarche(nouveauDossierPartiel)
    }

    const champsPossibles = [
        "DropDownListChampDescriptor",
        "MultipleDropDownListChampDescriptor",
        "YesNoChampDescriptor",
        "CheckboxChampDescriptor",
        "HeaderSectionChampDescriptor",
    ]
    
    let champsRemplissables = schemaDS88444["revision"]["champDescriptors"].filter((champ) => {
        return champsPossibles.includes(champ["__typename"])
    })

    /** @type {Record<string, keyof DossierDémarcheSimplifiée88444>} */
    const correspondanceSchemaDS88444etTypeDossier88444 = {
        "Le demandeur est…": "Le demandeur est…",
        "Activité principale": "Objet du projet",
        "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?": "Le projet est-il soumis au régime de l'Autorisation Environnementale (article L. 181-1 du Code de l'environnement) ?",
        "À quelle procédure le projet est-il soumis ?": "À quelle procédure le projet est-il soumis ?",
        "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation": "J'atteste qu'il n'existe aucune alternative satisfaisante permettant d'éviter la dérogation",
        "Motif de la dérogation": "Motif de la dérogation",
        "Éolien - Votre demande concerne :": "Éolien - Votre demande concerne :",
        "Urbanisation - Votre demande concerne :": "Urbanisation - Votre demande concerne :",
        "Transport ferroviaire ou électrique - Votre demande concerne :": "Transport ferroviaire ou électrique - Votre demande concerne :",
        "Recherche scientifique - Votre demande concerne :": "Recherche scientifique - Votre demande concerne :",
        "Prise ou détention limité ou spécifié - Précisez": "Prise ou détention limité ou spécifié - Précisez",
        "Captures/Relâchers/Prélèvement - Finalité(s) de la demande": "Captures/Relâchers/Prélèvement - Finalité(s) de la demande",
        "Cette demande concerne un programme de suivi déjà existant": "Cette demande concerne un programme déjà existant",
        "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?": "En cas de mortalité lors de ces suivis, y a-t-il eu des mesures complémentaires prises ?",
        "Le projet se situe au niveau…": "Le projet se situe au niveau…",
        "Suivi de mortalité - Votre demande concerne :": "Suivi de mortalité - Votre demande concerne :",
        "En cas de nécessité de capture d'individus, précisez le mode de capture": "En cas de nécessité de capture d'individus, précisez le mode de capture",
        "Utilisez-vous des sources lumineuses ?": "Utilisez-vous des sources lumineuses ?",
        "Des mesures ERC sont-elles prévues ?": "Des mesures ERC sont-elles prévues ?"
    }
</script>

<Squelette {email}>
    <div class="fr-grid-row fr-grid-row--center">
        <div class="fr-col-8">
            <h1>Pré-remplissage dérogation espèces protégées</h1>

            <form>
                {#each champsRemplissables as champ}
                    {#if champ["__typename"] == "HeaderSectionChampDescriptor"}
                        <h3>{champ["label"]}</h3>
                    {:else}
                        <fieldset class="fr-fieldset fr-p-1-5v">
                            <div class="fr-fieldset__element">
                                <div class="fr-input-group">
                                    <label class="fr-label" for="{champ["label"]}">
                                        {champ["label"]} 
                                    </label>

                                    <select 
                                        bind:value={nouveauDossierPartiel[correspondanceSchemaDS88444etTypeDossier88444[champ["label"]]]} 
                                        on:change={onSelectChanged}
                                        id="{champ["label"]}"
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
                        </fieldset>
                    {/if}
                {/each}
            </form>

            <div class="fr-callout fr-callout--brown-caramel">
                <h3 class="fr-callout__title">Votre lien de préremplissage pour une dérogation espèces protégées</h3>

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
                                        {#if typeof nouveauDossierPartiel[champPrerempli] === "boolean" }
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
                            Vous n'avez encore pré-rempli aucun champ de la dérogation. Vous pouvez sélectionnez des options ci-dessus afin d'obtenir votre lien de pré-remplissage.
                        </p>
                    {/if}
                </div>
            </div>
        </div>

    </div>
</Squelette>