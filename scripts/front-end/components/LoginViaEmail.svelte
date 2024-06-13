<script>
    import Squelette from './Squelette.svelte'

    /** @type {Set<string>} */
    export let authorizedEmailDomains

    /** @type {(email: string) => Promise<void>}  */
    export let envoiEmailConnexion
    let email;


</script>

<Squelette nav={false}>
    <div class="fr-grid-row fr-pt-6w fr-grid-row--center">
        <div class="fr-col-8">
            <h1>Connexion par email</h1>

            <p>Saisissez votre adresse email ici et vous recevrez un email avec un lien secret pour vous connecter à Pitchou.</p>
            <p>⚠️ Seules les adresses emails venant d'un de ces domaine peuvent recevoir un lien de connexion : 
                {#each [...authorizedEmailDomains] as authorizedEmailDomain, i}
                    {#if i !== 0} ,&nbsp; {/if}
                    <code class="hostname">{authorizedEmailDomain}</code>
                {/each}
            </p>
        </div>
    </div>

    <div class="fr-grid-row fr-pb-6w fr-grid-row--center">
        <div class="fr-col-6">
            <form on:submit|preventDefault={() => envoiEmailConnexion(email)}>
                <label class="fr-label" for="email">Adresse email</label>
                <input class="fr-input" autocomplete="email" type="email" id="email" bind:value={email}>
                <button class="fr-btn">Obtenir un lien de connexion par email</button>
            </form>
        </div>
    </div>
</Squelette>


<style lang="scss">
    code.hostname{
        white-space: nowrap;
    }
</style>
