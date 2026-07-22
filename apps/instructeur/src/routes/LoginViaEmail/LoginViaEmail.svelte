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

  let showDomains = $state(false);

  const domaine = $derived(normalizeEmail(email).split("@")[1] ?? "");
  const domaineAutorise = $derived(authorizedEmailDomains.has(domaine));

  const sortedDomains = $derived([...authorizedEmailDomains].sort((a, b) => a.localeCompare(b)));

  function onSubmit() {
    if (!domaineAutorise) return;
    emailInProgress = envoiEmailConnexion(normalizeEmail(email));
  }
</script>

<svelte:head>
  <title>Connexion — Pitchou</title>
</svelte:head>

<div class="fr-grid-row fr-grid-row--center fr-my-8w">
  <div class="fr-col-12 fr-col-md-9 fr-col-lg-7">
    <div class="fr-background-alt--grey fr-px-4w fr-px-md-8w fr-py-6w fr-py-md-8w">
      <h1>Connexion à Pitchou</h1>

      <p>
        Saisissez votre adresse email et vous recevrez un email avec un lien secret pour vous
        connecter à Pitchou.
      </p>

      <form onsubmit={preventDefault(onSubmit)}>
        <div class="fr-input-group" class:fr-input-group--error={domaine && !domaineAutorise}>
          <label class="fr-label" for="email">
            Adresse email
            <span class="fr-hint-text">Format attendu&nbsp;: nom@domaine.gouv.fr</span>
          </label>
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

        <ul class="fr-btns-group fr-mt-2w">
          <li>
            <button class="fr-btn" disabled={!domaineAutorise}>
              Obtenir un lien de connexion par email
            </button>
          </li>
        </ul>

        {#if emailInProgress}
          {#await emailInProgress}
            <Loader />
          {:then}
            <div class="fr-alert fr-alert--success fr-alert--sm fr-mt-2w">
              <p>📧 Vous devriez avoir reçu un email avec votre lien de connexion.</p>
            </div>
          {:catch}
            <div class="fr-alert fr-alert--error fr-alert--sm fr-mt-2w">
              <p>
                Une erreur est survenue lors de l'envoi de l'email de connexion. Vérifiez votre
                adresse ou réessayez plus tard.
              </p>
            </div>
          {/await}
        {/if}
      </form>

      <hr class="fr-mt-4w fr-pb-4w" />

      <div class="fr-alert fr-alert--info fr-alert--sm">
        <p>
          Seules les adresses email des services de l'État autorisés (ministère, préfectures…)
          peuvent recevoir un lien de connexion.
        </p>
        <p class="fr-mt-1w">
          <button
            type="button"
            class="fr-link"
            aria-expanded={showDomains}
            onclick={() => (showDomains = !showDomains)}
          >
            {showDomains ? "Masquer" : "Consulter"} la liste des {authorizedEmailDomains.size} domaines
            autorisés
          </button>
        </p>
      </div>

      {#if showDomains}
        <ul class="domaines-list fr-mt-2w">
          {#each sortedDomains as authorizedEmailDomain}
            <li>{authorizedEmailDomain}</li>
          {/each}
        </ul>
      {/if}
    </div>
  </div>
</div>

<style lang="scss">
  // Full-width primary button, following the DSFR login page model
  .fr-btns-group .fr-btn {
    width: 100%;
    justify-content: center;
  }

  // One domain per row
  .domaines-list {
    margin: 0;
    padding: 0;
    list-style: none;

    li {
      padding: 0.25rem 0;
      white-space: nowrap;

      & + li {
        border-top: 1px solid var(--border-default-grey);
      }
    }
  }
</style>
