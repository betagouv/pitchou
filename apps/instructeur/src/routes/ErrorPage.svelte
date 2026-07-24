<script lang="ts">
  const CONTACT_EMAIL = "support@pitchou.beta.gouv.fr";

  type Props = {
    status?: number;
    message?: string;
  };

  let { status = 404, message }: Props = $props();

  let emailCopied = $state(false);

  function copyEmail() {
    navigator.clipboard
      .writeText(CONTACT_EMAIL)
      .then(() => {
        emailCopied = true;
      })
      .catch((error) => {
        console.error("Une erreur s'est produite lors de la copie : ", error);
      });
  }

  const isNotFound = $derived(status === 404);

  const heading = $derived(isNotFound ? "Page introuvable" : "Une erreur est survenue");

  const title = $derived(isNotFound ? "Page introuvable" : `Erreur ${status}`);

  const lead = $derived(
    isNotFound
      ? "La page que vous cherchez est introuvable. Excusez-nous pour la gêne occasionnée."
      : (message ?? "Un problème technique est survenu. Excusez-nous pour la gêne occasionnée."),
  );
</script>

<svelte:head>
  <title>{title} — Pitchou</title>
</svelte:head>

<div
  class="fr-my-7w fr-mt-md-12w fr-mb-md-10w fr-grid-row fr-grid-row--gutters fr-grid-row--middle fr-grid-row--center"
>
  <div class="fr-py-0 fr-col-12 fr-col-md-6">
    <h1>{heading}</h1>
    <p class="fr-text--sm fr-mb-3w">Erreur {status}</p>
    <p class="fr-text--lead fr-mb-3w">{lead}</p>
    {#if isNotFound}
      <p class="fr-text--sm fr-mb-5w">
        Si vous avez saisi l'adresse manuellement, vérifiez qu'elle est correcte&nbsp;: la page
        n'est peut-être plus disponible.<br />
        Sinon, vous pouvez revenir à l'accueil ou contacter l'équipe Pitchou.
      </p>
    {:else}
      <p class="fr-text--sm fr-mb-5w">
        Vous pouvez réessayer plus tard, revenir à l'accueil ou contacter l'équipe Pitchou si le
        problème persiste.
      </p>
    {/if}
    <ul class="fr-btns-group fr-btns-group--inline-md">
      <li>
        <a class="fr-btn" href="/">Page d'accueil</a>
      </li>
      <li>
        <a
          class="fr-btn fr-btn--secondary"
          href={`mailto:${CONTACT_EMAIL}?subject=Page%20introuvable%20sur%20Pitchou`}
        >
          Contacter l'équipe Pitchou
        </a>
      </li>
    </ul>
    <p class="fr-text--sm fr-mt-5w fr-mb-1w email-contact__label">Ou écrivez-nous directement :</p>
    <p class="email-contact fr-mb-0">
      <span class="email-contact__adresse fr-text--bold">{CONTACT_EMAIL}</span>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left"
        class:fr-icon-clipboard-line={!emailCopied}
        class:fr-icon-check-line={emailCopied}
        onclick={copyEmail}
        aria-label={`Copier l'adresse ${CONTACT_EMAIL}`}
      >
        {emailCopied ? "Copié !" : "Copier"}
      </button>
    </p>
  </div>
  <div class="fr-col-12 fr-col-md-3 fr-col-offset-md-1 fr-px-6w fr-px-md-0 fr-py-0">
    <svg
      class="illustration"
      aria-hidden="true"
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="68" cy="68" r="46" class="trait" fill="none" stroke-width="6" />
      <line x1="101" y1="101" x2="140" y2="140" class="trait" stroke-width="8" />
      <text x="68" y="68" class="code" text-anchor="middle" dominant-baseline="central"
        >{status}</text
      >
    </svg>
  </div>
</div>

<style lang="scss">
  .illustration {
    width: 100%;
    height: auto;
    max-width: 14rem;
    display: block;
    margin: 0 auto;

    .trait {
      stroke: var(--blue-france-sun-113-625);
      stroke-linecap: round;
    }

    .code {
      fill: var(--text-title-grey);
      font-size: 2.5rem;
      font-weight: 700;
    }
  }

  .email-contact__label {
    color: var(--text-mention-grey);
  }

  .email-contact {
    display: inline-flex;
    align-items: center;
    gap: 0.75rem;
    max-width: 100%;
    padding: 0.25rem 0.25rem 0.25rem 1rem;
    border: 1px solid var(--border-default-grey);
  }

  .email-contact__adresse {
    overflow-wrap: anywhere;
    font-weight: 700;
  }

  .email-contact button {
    flex: none;
    border-left: 1px solid var(--border-default-grey);
    border-radius: 0;
  }
</style>
