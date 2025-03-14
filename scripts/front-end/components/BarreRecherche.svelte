<script>
    //@ts-check

    /** @type {string} */
    export let titre

    /** @type {function}*/
    export let mettreÀJourTexteRecherche

    let valeur = ""
    
    /**
     * 
     * @param {SubmitEvent} e
     */
    function onMettreÀJourValeurSélectionnée(e) {
        e.preventDefault()
        mettreÀJourTexteRecherche(valeur)
        valeur = ""
    }
</script>

<form on:submit={onMettreÀJourValeurSélectionnée} role="search"> 
    <div class="form-recherche">
        <label class="sr-only" for="recherche-texte">{titre}</label>
        <input type="text" name="recherche-texte" id="recherche-texte" placeholder="{titre}" class="fr-input" bind:value={valeur} />
        <button class="fr-btn" type="submit">Chercher</button>
    </div>
    
    <p class="fr-hint-text">
        Vous pouvez rechercher par 
        départements, 
        communes, 
        nom de projet, 
        porteur de projet, 
        numéro de dossier DS,
        identifiant Pitchou, 
        numéro Onagre.
    </p>
</form>

<style lang="scss">
    .form-recherche {
        display: flex;
        width: 70%;
    }

    .sr-only {
        border: none;
        clip: rect(1px, 1px, 1px, 1px);
        clip-path: inset(50%);
        height: 1px;
        margin: -1px;
        width: 1px;
        overflow: hidden;
        position: absolute !important;
        word-wrap: normal !important;
    }
</style>
