<script lang="ts">
  import Squelette from "../Squelette.svelte";

  type Props = {
    status?: number;
    message?: string;
  };

  let { status = 404, message }: Props = $props();

  const isNotFound = $derived(status === 404);

  const heading = $derived(isNotFound ? "Page introuvable" : "Une erreur est survenue");

  const title = $derived(isNotFound ? "Page introuvable" : `Erreur ${status}`);

  const lead = $derived(
    isNotFound
      ? "La page que vous cherchez est introuvable. Excusez-nous pour la gêne occasionnée."
      : (message ?? "Un problème technique est survenu. Excusez-nous pour la gêne occasionnée."),
  );
</script>

<Squelette nav={false} {title}>
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
            href="mailto:pitchou@beta.gouv.fr?subject=Page%20introuvable%20sur%20Pitchou"
          >
            Contacter l'équipe Pitchou
          </a>
        </li>
      </ul>
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
        <text x="68" y="68" class="code" text-anchor="middle" dominant-baseline="central">{status}</text>
      </svg>
    </div>
  </div>
</Squelette>

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
</style>
