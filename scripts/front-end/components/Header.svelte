<script lang="ts">
  import { goto } from "$app/navigation";
  import { logout } from "../actions/main.ts";

  type Props = {
    email?: string | undefined;
  };

  let { email = undefined }: Props = $props();

  function logoutAndRedirect() {
    logout().then(() => goto("/"));
  }
</script>

<div class="fr-skiplinks">
  <nav aria-label="Accès rapide" class="fr-container">
    <ul class="fr-skiplinks__list">
      <li>
        <a class="fr-link" href="#main">Contenu</a>
      </li>
    </ul>
  </nav>
</div>

<header class="fr-header">
  <div class="fr-header__body">
    <div class="fr-container">
      <div class="fr-header__body-row">
        <div class="fr-header__brand fr-enlarge-link">
          <div class="fr-header__brand-top">
            <div class="fr-header__logo">
              <p class="fr-logo">
                République
                <br />Française
              </p>
            </div>
          </div>
          <div class="fr-header__service">
            <a href="/" title="Accueil - Pitchou - DGALN">
              <p class="fr-header__service-title">Pitchou</p>
            </a>
            <p class="fr-header__service-tagline">Demandes de Dérogation Espèces Protégées</p>
          </div>
        </div>

        {#if email}
          <div class="fr-header__tools">
            <div class="fr-header__tools-links">
              <ul class="fr-btns-group">
                <li>
                  <span>{email}</span>
                  <button class="fr-btn fr-icon-lock-line" onclick={logoutAndRedirect}>
                    Se déconnecter
                  </button>
                </li>
              </ul>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>
  <div class="fr-header__menu fr-modal" id="modal-2568" aria-labelledby="button-2569">
    <div class="fr-container">
      <button
        aria-controls="modal-2568"
        id="button-2571"
        title="Fermer"
        class="fr-btn--close fr-btn">Fermer</button
      >
      <div class="fr-header__menu-links"></div>
    </div>
  </div>
</header>
