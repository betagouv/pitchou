<script lang="ts">
  import type { FooterProps } from "./index.ts";

  let { description, brand = true, fluid = false, top, bottomExtra }: FooterProps = $props();

  // Same side paddings as the signed-in header band, so both edges line up.
  const containerClass = $derived(fluid ? "w-full px-4 lg:px-8" : "fr-container");

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-fr-theme") === "dark" ? "light" : "dark";
    // DSFR watches data-fr-scheme, applies data-fr-theme and persists the choice.
    root.setAttribute("data-fr-scheme", next);
  }
</script>

<!-- The DSFR footer is transparent outside of its top section, which would let the grey
     page background show through: make the links part white (theme-aware) explicitly. -->
<footer class="fr-footer fr-mt-2w bg-[var(--background-default-grey)]" id="footer">
  {#if top}
    <!-- Without the brand block, nothing sits between the top section and the bottom
         links: collapse the DSFR margins reserved for it so no white gap remains. -->
    <div class="fr-footer__top {brand ? '' : 'mb-0'}">
      <div class={containerClass}>
        <div class="fr-grid-row fr-grid-row--start fr-grid-row--gutters">
          {@render top()}
        </div>
      </div>
    </div>
  {/if}
  <div class={containerClass}>
    {#if brand}
      <div class="fr-footer__body">
        <div class="fr-footer__brand fr-enlarge-link">
          <p class="fr-logo">République <br />Française</p>
        </div>
        <div class="fr-footer__content">
          <p class="fr-footer__content-desc">{description}</p>
          <p class="fr-footer__content-desc">
            <strong>Besoin d'aide pour utiliser pitchou ?</strong><br />
            <a
              class="fr-footer__content-link fr-text--regular underline"
              href="mailto:support@pitchou.beta.gouv.fr">support@pitchou.beta.gouv.fr</a
            >
          </p>
          <ul class="fr-footer__content-list">
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                target="_blank"
                rel="noopener external"
                title="info.gouv.fr - nouvelle fenêtre"
                href="https://info.gouv.fr">info.gouv.fr</a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                target="_blank"
                rel="noopener external"
                title="service-public.gouv.fr - nouvelle fenêtre"
                href="https://service-public.gouv.fr">service-public.gouv.fr</a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                target="_blank"
                rel="noopener external"
                title="legifrance.gouv.fr - nouvelle fenêtre"
                href="https://legifrance.gouv.fr">legifrance.gouv.fr</a
              >
            </li>
            <li class="fr-footer__content-item">
              <a
                class="fr-footer__content-link"
                target="_blank"
                rel="noopener external"
                title="data.gouv.fr - nouvelle fenêtre"
                href="https://data.gouv.fr">data.gouv.fr</a
              >
            </li>
          </ul>
        </div>
      </div>
    {/if}
    <div class="fr-footer__bottom {brand ? '' : 'mt-0'}">
      <ul class="fr-footer__bottom-list">
        <li class="fr-footer__bottom-item">
          <a href="/plan-du-site" class="fr-footer__bottom-link"> Plan du site </a>
        </li>
        <li class="fr-footer__bottom-item">
          <a
            id="footer__bottom-link-accessibilite"
            href="/accessibilite"
            class="fr-footer__bottom-link"
          >
            Accessibilité : non conforme
          </a>
        </li>
        <li class="fr-footer__bottom-item">
          <a href="/donnees-personnelles" class="fr-footer__bottom-link"> Données personnelles </a>
        </li>
        <li class="fr-footer__bottom-item">
          <a href="/mentions-legales" class="fr-footer__bottom-link"> Mentions légales </a>
        </li>
        <li class="fr-footer__bottom-item">
          <button
            class="fr-footer__bottom-link fr-icon-theme-fill fr-link--icon-left"
            onclick={toggleTheme}
          >
            Paramètres d'affichage
          </button>
        </li>
        {#if bottomExtra}
          {@render bottomExtra()}
        {/if}
      </ul>
      <div class="fr-footer__bottom-copy">
        <p>
          Sauf mention explicite de propriété intellectuelle détenue par des tiers, les contenus de
          ce site sont proposés sous <a
            href="https://github.com/etalab/licence-ouverte/blob/master/LO.md"
            rel="noopener external"
            title="Voir la licence Etalab 2.0 - nouvelle fenêtre"
            target="_blank">licence etalab-2.0</a
          >
        </p>
      </div>
    </div>
  </div>
</footer>
