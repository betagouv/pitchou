<script>
    import { créerLienPréremplissageDémarche } from '../../../commun/préremplissageDémarcheSimplifiée';
    import Squelette from '../Squelette.svelte'
    import Loader from '../Loader.svelte'
    import { json } from 'd3-fetch';
    import { isFuture } from 'date-fns/isFuture';

    /** @import {DossierDémarcheSimplifiée88444} from "../../../types.js" */

    /** @type {DossierDémarcheSimplifiée88444} */
    let nouveauDossierPartiel = {}
    let lienDePreremplissage = ""
    $: champsPreremplis = Object.keys(nouveauDossierPartiel).filter(champ => {
        return nouveauDossierPartiel[champ] != ""
    })

    let onSelectChanged = (e) => {
        lienDePreremplissage = créerLienPréremplissageDémarche(nouveauDossierPartiel)
    }

    const démarcheSimplifiée88444SchemaPath = '../../../../data/schema-DS-88444.json'
    const champsPossibles = [
        "DropDownListChampDescriptor",
        "MultipleDropDownListChampDescriptor",
        "YesNoChampDescriptor",
        "CheckboxChampDescriptor",
    ]
    
    let champsRemplissablesP = json(démarcheSimplifiée88444SchemaPath).then((schema) => {
        return schema["revision"]["champDescriptors"].filter((champ) => {
            return champsPossibles.includes(champ["__typename"])
        })
    })
</script>

<Squelette>
    <div class="fr-grid-row fr-grid-row--center">
        <div class="fr-col-8">
            <h1>Pré-remplissage dérogation espèces protégées</h1>

            {#await champsRemplissablesP}
                <Loader />
            {:then champsRemplissables}
                <form>
                    {#each champsRemplissables as champ}
                        <fieldset class="fr-fieldset fr-p-1-5v">
                            <div class="fr-fieldset__element">
                                <div class="fr-input-group">
                                    <label class="fr-label" for="{champ["label"]}">
                                        {champ["label"]} 
                                        {#if nouveauDossierPartiel[champ["label"]]}
                                        ✅
                                        {/if}
                                    </label>

                                    <select 
                                        bind:value={nouveauDossierPartiel[champ["label"]]} 
                                        on:change={onSelectChanged}
                                        id="{champ["label"]}"
                                        class="fr-select"
                                    >
                                        {#if champ["options"]}
                                            <option value="" selected></option>
                                            {#each champ["options"] as option}
                                                <option value="{option}">{option}</option>
                                            {/each}
                                        {:else}
                                            <option value="" selected></option>
                                            <option value="false">non</option>
                                            <option value="true">oui</option>
                                        {/if}
                                    </select>
                                </div>
                            </div>
                        </fieldset>
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
                                        <em>{nouveauDossierPartiel[champPrerempli]}</em>
                                    </li>
                                {/each}
                            </ul>
                            <pre>
                                <code class="code-block">{lienDePreremplissage}</code>
                            </pre>
                        {:else}
                            <p class="fr-mt-2w">
                                Vous n'avez encore pré-rempli aucun champ de la dérogation. Vous pouvez sélectionnez des options ci-dessus afin d'obtenir votre lien de pré-remplissage.
                            </p>
                        {/if}
                    </div>
                </div>
            {/await}
        </div>

    </div>
</Squelette>

<style lang="scss">
    .selected { 
        background-color: red;
    }
    
    .code-block {
        background-color: #333333;
        color: #FFFFFF;
        border-radius: 3px;
        padding: 2rem;
        display: flex;
        align-items: center;
        font-weight: bold;
        overflow: auto;
    }
</style>