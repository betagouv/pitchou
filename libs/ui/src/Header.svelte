<script lang="ts">
  import type { HeaderProps } from "./index.ts";

  let {
    serviceTitle,
    serviceTagline = "",
    serviceHref = "/",
    tools,
    menuLinks,
    nav,
  }: HeaderProps = $props();

  // The menu modal (and its toggle button) is only useful when there is
  // something to put inside it.
  let showMenu = $derived(Boolean(menuLinks || nav));
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
            {#if showMenu}
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
            <a href={serviceHref} title={`Accueil - ${serviceTitle}`}>
              <p class="fr-header__service-title">{serviceTitle}</p>
            </a>
            {#if serviceTagline}
              <p class="fr-header__service-tagline">{serviceTagline}</p>
            {/if}
          </div>
        </div>

        {#if tools}
          <div class="fr-header__tools fr-hidden fr-unhidden-lg">
            {@render tools()}
          </div>
        {/if}
      </div>
    </div>
  </div>

  {#if showMenu}
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
        {#if menuLinks}
          <div class="fr-header__menu-links">
            {@render menuLinks()}
          </div>
        {/if}
        {#if nav}
          {@render nav()}
        {/if}
      </div>
    </div>
  {/if}
</header>
