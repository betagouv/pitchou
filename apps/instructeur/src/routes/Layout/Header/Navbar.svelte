<script lang="ts">
  import { sendEvenement } from "$lib/shared/aarri.ts";
  import type { EvenementNavbarLink } from "@pitchou/types/evenement.d.ts";

  function trackNavbarLinkClick(link: EvenementNavbarLink) {
    sendEvenement({ type: "clickNavbarLink", details: { link } });
  }
</script>

<nav class="fr-nav" aria-label="Menu principal">
  <ul class="fr-nav__list">
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="/mes-dossiers"
        onclick={() => trackNavbarLinkClick("mes-dossiers")}>Mes dossiers</a
      >
    </li>
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="/tous-les-dossiers"
        onclick={() => trackNavbarLinkClick("tous-les-dossiers")}>Tous les dossiers</a
      >
    </li>
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="/tableau-de-suivi"
        onclick={() => trackNavbarLinkClick("tableau-de-suivi")}
        >Tableau de suivi <span class="fr-badge fr-badge--sm">Obsolète</span></a
      >
    </li>
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="/saisie-especes"
        onclick={() => trackNavbarLinkClick("saisie-especes")}>Saisie espèces protégées</a
      >
    </li>
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="/preremplissage-derogation"
        onclick={() => trackNavbarLinkClick("preremplissage-derogation")}
        >Pré-remplissage dérogation</a
      >
    </li>
    <li class="fr-nav__item">
      <a
        class="fr-nav__link"
        href="https://betagouv.github.io/pitchou/"
        target="_blank"
        onclick={() => trackNavbarLinkClick("aide-pitchou")}>Aide pitchou</a
      >
    </li>
  </ul>
</nav>

<style lang="scss">
  nav span.fr-badge {
    font-size: 0.55rem;
  }
</style>
