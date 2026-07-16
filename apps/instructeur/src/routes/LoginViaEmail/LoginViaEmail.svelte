<script lang="ts">
  import { preventDefault } from "svelte/legacy";

  import Loader from "$lib/components/Loader.svelte";
  import { normalizeEmail } from "@pitchou/common/stringManipulation.ts";

  type Props = {
    authorizedEmailDomains: Set<string>;
    envoiEmailConnexion: (email: string) => Promise<unknown>;
  };

  let { authorizedEmailDomains, envoiEmailConnexion }: Props = $props();

  let email: string = $state("");

  let emailInProgress: Promise<unknown> | undefined = $state();

  const domaine = $derived(normalizeEmail(email).split("@")[1] ?? "");
  const domaineAutorise = $derived(authorizedEmailDomains.has(domaine));

  function onSubmit() {
    if (!domaineAutorise) return;
    emailInProgress = envoiEmailConnexion(normalizeEmail(email));
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
      <div class="fr-input-group" class:fr-input-group--error={domaine && !domaineAutorise}>
        <label class="fr-label" for="email">Adresse email</label>
        <input
          class="fr-input"
          class:fr-input--error={domaine && !domaineAutorise}
          autocomplete="email"
          type="email"
          id="email"
          aria-describedby={domaine && !domaineAutorise ? "email-erreur" : undefined}
          bind:value={email}
        />
        {#if domaine && !domaineAutorise}
          <p id="email-erreur" class="fr-error-text">
            Le domaine «&nbsp;{domaine}&nbsp;» ne fait pas partie des domaines autorisés à se
            connecter.
          </p>
        {/if}
      </div>
      <button class="fr-btn fr-mt-2w" disabled={!domaineAutorise}>
        Obtenir un lien de connexion par email
      </button>
      {#if emailInProgress}
        {#await emailInProgress}
          <Loader />
        {/await}
      {/if}
    </form>
    {#if emailInProgress}
      {#await emailInProgress then}
        ✅ 📧 Vous devriez avoir reçu un email avec votre lien de connexion
      {:catch}
        <p class="fr-error-text fr-mt-2w">
          Une erreur est survenue lors de l'envoi de l'email de connexion. Vérifiez votre adresse ou
          réessayez plus tard.
        </p>
      {/await}
    {/if}
  </div>
</div>

<style lang="scss">
  code.hostname {
    white-space: nowrap;
  }
</style>
