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
    <p class="fr-text--sm fr-mt-5w fr-mb-1w fr-text-mention--grey">Ou écrivez-nous directement :</p>
    <p
      class="inline-flex items-center gap-3 max-w-full fr-py-1v fr-pr-1v fr-pl-2w border border-[color:var(--border-default-grey)] fr-mb-0"
    >
      <span class="[overflow-wrap:anywhere] fr-text--bold">{CONTACT_EMAIL}</span>
      <button
        type="button"
        class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left flex-none border-l border-l-[color:var(--border-default-grey)] rounded-none"
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
      class="w-full h-auto max-w-[14rem] block mx-auto"
      aria-hidden="true"
      viewBox="0 0 160 160"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle
        cx="68"
        cy="68"
        r="46"
        class="stroke-[var(--blue-france-sun-113-625)] [stroke-linecap:round]"
        fill="none"
        stroke-width="6"
      />
      <line
        x1="101"
        y1="101"
        x2="140"
        y2="140"
        class="stroke-[var(--blue-france-sun-113-625)] [stroke-linecap:round]"
        stroke-width="8"
      />
      <text
        x="68"
        y="68"
        class="fill-[var(--text-title-grey)] text-[2.5rem] fr-text--bold"
        text-anchor="middle"
        dominant-baseline="central">{status}</text
      >
    </svg>
  </div>
</div>
