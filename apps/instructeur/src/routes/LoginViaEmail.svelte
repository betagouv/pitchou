<script lang="ts">
  import { preventDefault } from "svelte/legacy";

  import Loader from "$lib/components/Loader.svelte";
  import { normalisationEmail } from "@pitchou/common/manipulationStrings.ts";

  type Props = {
    authorizedEmailDomains: Set<string>;
    envoiEmailConnexion: (email: string) => Promise<unknown>;
  };

  let { authorizedEmailDomains, envoiEmailConnexion }: Props = $props();

  let email: string = $state("");

  let emailInProgress: Promise<unknown> | undefined = $state();

  function onSubmit() {
    emailInProgress = envoiEmailConnexion(normalisationEmail(email));
  }
</script>

<svelte:head>
  <title>Connexion — Pitchou</title>
</svelte:head>

<div class="fr-grid-row fr-mt-6w fr-grid-row--center">
  <div class="fr-col-8">
    <h1>Connexion par email</h1>

    <p>
      Saisissez votre adresse email ici et vous recevrez un email avec un lien secret pour vous
      connecter à Pitchou.
    </p>
    <p>
      ⚠️ Seules les adresses emails venant d'un de ces domaine peuvent recevoir un lien de connexion
      :
      {#each [...authorizedEmailDomains] as authorizedEmailDomain, i}
        {#if i !== 0}
          ,&nbsp;
        {/if}
        <code class="hostname">{authorizedEmailDomain}</code>
      {/each}
    </p>
  </div>
</div>

<div class="fr-grid-row fr-pb-6w fr-grid-row--center">
  <div class="fr-col-6">
    <form onsubmit={preventDefault(onSubmit)}>
      <label class="fr-label" for="email">Adresse email</label>
      <input class="fr-input" autocomplete="email" type="email" id="email" bind:value={email} />
      <button class="fr-btn">Obtenir un lien de connexion par email</button>
      {#if emailInProgress}
        {#await emailInProgress}
          <Loader />
        {/await}
      {/if}
    </form>
    {#if emailInProgress}
      <!-- svelte-ignore block_empty -->
      {#await emailInProgress then}
        ✅ 📧 Vous devriez avoir reçu un email avec votre lien de connexion
      {/await}
    {/if}
  </div>
</div>

<style lang="scss">
  code.hostname {
    white-space: nowrap;
  }
</style>
