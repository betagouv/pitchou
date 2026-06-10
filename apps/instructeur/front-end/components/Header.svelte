<script lang="ts">
  import { goto } from "$app/navigation";
  import { logout } from "../actions/main.ts";

  import AccountMenu from "./AccountMenu.svelte";
  import Navbar from "./Navbar.svelte";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
  };

  let { nav = true, email = undefined }: Props = $props();

  let afficheMenu = $derived(nav || Boolean(email));

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
            {#if afficheMenu}
              <div class="fr-header__navbar">
                <button
                  data-fr-opened="false"
                  aria-controls="modal-header-menu"
                  title="Menu"
                  type="button"
                  id="button-header-menu"
                  class="fr-btn--menu fr-btn">Menu</button
                >
              </div>
            {/if}
          </div>
          <div class="fr-header__service">
            <a href="/" title="Accueil - Pitchou - DGALN">
              <p class="fr-header__service-title">Pitchou</p>
            </a>
            <p class="fr-header__service-tagline">Demandes de Dérogation Espèces Protégées</p>
          </div>
        </div>

        {#if email}
          <div class="fr-header__tools fr-hidden fr-unhidden-lg">
            <AccountMenu {email} onLogout={logoutAndRedirect} />
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if afficheMenu}
    <div
      class="fr-header__menu fr-modal"
      id="modal-header-menu"
      aria-labelledby="button-header-menu"
    >
      <div class="fr-container">
        <button
          aria-controls="modal-header-menu"
          title="Fermer"
          type="button"
          class="fr-btn--close fr-btn">Fermer</button
        >
        <div class="fr-header__menu-links">
          {#if email}
            <AccountMenu {email} onLogout={logoutAndRedirect} align="start" />
          {/if}
        </div>
        {#if nav}
          <Navbar />
        {/if}
      </div>
    </div>
  {/if}
</header>
