<script>
    /** @type {Set<string>} */
    export let authorizedEmailDomains

    /** @type {(email: string) => Promise<void>}  */
    export let envoiEmailConnexion
    let email;


</script>


<h1>Connexion par email</h1>

<p>Saisissez votre adresse email ici et vous recevrez un email avec un lien secret pour vous connecter à Pitchou.</p>
<p>⚠️ Seules les adresses emails venant d'un de ces domaine peuvent recevoir un lien de connexion : 
    {#each [...authorizedEmailDomains] as authorizedEmailDomain, i}
        {#if i !== 0} ,&nbsp; {/if}
        <code class="hostname">{authorizedEmailDomain}</code>
    {/each}
</p>

<form on:submit|preventDefault={() => envoiEmailConnexion(email)}>
    <input autocomplete="email" type="email" bind:value={email}>
    <button>Obtenir un lien de connexion par email</button>
</form>


<style lang="scss">
    code.hostname{
        white-space: nowrap;
    }
</style>
