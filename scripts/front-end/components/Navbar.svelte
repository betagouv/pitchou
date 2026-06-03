<script lang="ts"></script>

<nav class="fr-nav" id="navigation-773" aria-label="Menu principal">
  <ul class="fr-nav__list">
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="/">Tableau de suivi</a>
    </li>
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="/mes-dossiers"
        >Mes dossiers <span class="fr-badge fr-badge--new fr-badge--sm">Expérimental</span></a
      >
    </li>
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="/tous-les-dossiers"
        >Tous les dossiers <span class="fr-badge fr-badge--new fr-badge--sm">Expérimental</span></a
      >
    </li>
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="/saisie-especes">Saisie espèces protégées</a>
    </li>
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="/preremplissage-derogation">Pré-remplissage dérogation</a>
    </li>
    <li class="fr-nav__item">
      <a class="fr-nav__link" href="https://betagouv.github.io/pitchou/" target="_blank"
        >Aide pitchou</a
      >
    </li>
  </ul>
</nav>

<style lang="scss">
  .fr-nav__item {
    // pour une raison pas claire, cette règle est annulée par une media query @media (min-width: 62em)
    // et ça casse le menu.
    // Cette ligne le répare
    position: relative;
  }

  nav span.fr-badge {
    font-size: 0.55rem;
  }
</style>
