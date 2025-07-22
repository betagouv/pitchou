<script>
    import DateInput from '../../common/DateInput.svelte'

    import toJSONPerserveDate from '../../../../commun/DateToJSON.js';
    import {typesDécisionAdministrative} from '../../../../commun/décision-administrative.js'

    /** @import {DécisionAdministrativePourTransfer} from '../../../../types/API_Pitchou.js' */

    /** @type {DécisionAdministrativePourTransfer} */
    export let décisionAdministrative

    /** @type {(décision: DécisionAdministrativePourTransfer) => any} */
    export let onValider

    /** @type {FileList | undefined}*/
    let fichiers

    /**
     * 
     * @param {Event} e
     */
    async function formSubmit(e){
        console.log('submit', fichiers)
        e.preventDefault()

        if(décisionAdministrative.date_signature){
            Object.defineProperty(décisionAdministrative.date_signature, 'toJSON', {value: toJSONPerserveDate})
        }
        if(décisionAdministrative.date_fin_obligations){
            Object.defineProperty(décisionAdministrative.date_fin_obligations, 'toJSON', {value: toJSONPerserveDate})
        }

        if(fichiers && fichiers.length >= 1){
            const fichier = fichiers[0]
            console.log('fichier', fichier)

            const nom = fichier.name
            const media_type = fichier.type

            const contenuBase64P = new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.addEventListener(
                    "load",
                    () => {resolve(reader.result)},
                    false
                );
                reader.addEventListener('error', reject)
                reader.readAsDataURL(fichier);
            }) 

            let contenuBase64 = await contenuBase64P
            
            // retirer le prefix de la dataURL pour ne garder que le contenu en base64
            const dataURLPrefix = `data:${media_type};base64,`
            contenuBase64 = contenuBase64.slice(dataURLPrefix.length)

            décisionAdministrative.fichier_base64 = {
                nom,
                media_type, 
                contenuBase64,
            }
        }

        onValider(décisionAdministrative)
    }

</script>

<form on:submit={formSubmit}>
    <div class="fr-upload-group">
        <label class="fr-label" for="upload-fichier-décision">Fichier de la décision administrative 
            <span class="fr-hint-text">Indication : 
                Taille maximale&nbsp;: 100 Mo. 
                Formats supportés&nbsp;: pdf</span>
        </label>
        <input accept=".pdf" bind:files={fichiers} class="fr-upload" aria-describedby="upload-fichier-décision-messages" type="file" id="upload-fichier-décision" name="upload">
        <div class="fr-messages-group" id="upload-fichier-décision-messages" aria-live="polite">
        </div>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="input-numéro"> Numéro </label>
        <input class="fr-input" bind:value={décisionAdministrative.numéro} aria-describedby="input-numéro-messages" id="input-numéro" type="text">
        <div class="fr-messages-group" id="input-numéro-messages" aria-live="polite"></div>
    </div>

    <div class="fr-select-group">
        <label class="fr-label" for="select-type"> Type de décision </label>
        <select bind:value={décisionAdministrative.type} class="fr-select" aria-describedby="select-type-messages" id="select-type" name="select-type">
            <option value="" selected disabled>Sélectionnez une option</option>
            {#each typesDécisionAdministrative as type}
                <option value={type}>{type}</option>   
            {/each}
        </select>
        <div class="fr-messages-group" id="select-type-messages" aria-live="polite">
        </div>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="input-numéro"> Date de signature de la décision administrative </label>
        <DateInput bind:date={décisionAdministrative.date_signature}></DateInput>
    </div>

    <div class="fr-input-group">
        <label class="fr-label" for="input-numéro"> Date de fin des obligations </label>
        <DateInput bind:date={décisionAdministrative.date_fin_obligations}></DateInput>
    </div>

    <div class="fr-mb-6w">
        <slot name="bouton-valider">
            <button type="submit" class="fr-btn fr-btn--icon-left fr-icon-check-line">
                Enregistrer
            </button>
        </slot>

        <slot name="bouton-annuler" />
    </div>

    {#if $$slots['bouton-supprimer']}
    <div>
        <slot name="bouton-supprimer"/>
    </div>
    {/if}

</form>


<style lang="scss">
    form{
        margin-top: 1rem;
        margin-bottom: 2rem;
    }


</style>
