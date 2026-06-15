<script lang="ts">
  import { differenceInMinutes, format } from "date-fns";
  import { fr } from "date-fns/locale";

  import type { PitchouState } from "$lib/state/store.svelte.ts";

  const BUDGET_URL =
    "https://docs.google.com/spreadsheets/d/1E1z_SMXquqVnKvJXy7yKdGk1YPdV58_oaoLxBtf_k7s/edit?gid=0#gid=0";

  type Props = {
    résultatsSynchronisationDS88444?: PitchouState["résultatsSynchronisationDS88444"];
  };

  let { résultatsSynchronisationDS88444 = undefined }: Props = $props();

  let dernièreSynchronisationRéussie = $derived(
    résultatsSynchronisationDS88444 && résultatsSynchronisationDS88444.find((r) => r.succès),
  );

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-fr-theme") === "dark" ? "light" : "dark";
    // DSFR observe data-fr-scheme, applique data-fr-theme et persiste le choix
    root.setAttribute("data-fr-scheme", next);
  }

  function formatDate(date: Date): string {
    const diff = differenceInMinutes(new Date(), date);

    if (diff <= 1) {
      return `à l'instant`;
    }

    if (diff <= 30) {
      return `Il y a ${diff} minutes`;
    }

    return format(date, `d MMMM yyyy HH'h'mm`, { locale: fr });
  }
</script>

<footer class="fr-footer fr-mt-2w" id="footer">
  <div class="fr-footer__top">
    <div class="fr-container">
      <div class="fr-grid-row fr-grid-row--start fr-grid-row--gutters">
        <div class="fr-col-12 fr-col-sm-4 fr-col-md-3">
          <h3 class="fr-footer__top-cat">À propos</h3>
          <ul class="fr-footer__top-list">
            <li>
              <a class="fr-footer__top-link" href="/stats">Statistiques</a>
            </li>
            <li>
              <a
                class="fr-footer__top-link fr-icon-external-link-line fr-link--icon-right"
                href={BUDGET_URL}
                target="_blank"
                rel="noopener external"
                title="Budget - nouvelle fenêtre">Budget</a
              >
            </li>
            <li>
              <a
                class="fr-footer__top-link fr-icon-external-link-line fr-link--icon-right"
                href="https://github.com/betagouv/pitchou"
                target="_blank"
                rel="noopener external"
                title="Code source - nouvelle fenêtre">Code source</a
              >
            </li>
          </ul>
        </div>
        <div class="fr-col-12 fr-col-sm-4 fr-col-md-3">
          <h3 class="fr-footer__top-cat">Ressources</h3>
          <ul class="fr-footer__top-list">
            <li>
              <a class="fr-footer__top-link" href="/especes-protegees"
                >Liste des espèces protégées</a
              >
            </li>
            <li>
              <a class="fr-footer__top-link" href="/taxref">TAXREF</a>
            </li>
            <li>
              <a class="fr-footer__top-link" href="/bdc-statuts">BDC-Statuts</a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
  <div class="fr-container">
    <div class="fr-footer__body">
      <div class="fr-footer__brand fr-enlarge-link">
        <p class="fr-logo">République <br />Française</p>
      </div>
      <div class="fr-footer__content">
        <p class="fr-footer__content-desc">
          Pitchou accompagne l'instruction des demandes de dérogation à la protection des espèces.
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
    <div class="fr-footer__bottom">
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
          <button
            class="fr-footer__bottom-link fr-icon-theme-fill fr-link--icon-left"
            onclick={toggleTheme}
          >
            Paramètres d'affichage
          </button>
        </li>
        {#if dernièreSynchronisationRéussie}
          <li class="fr-footer__bottom-item">
            <span class="fr-footer__bottom-link">
              Dernière synchronisation avec DS&nbsp;:&nbsp;
              <span>{formatDate(dernièreSynchronisationRéussie.horodatage)}</span>
            </span>
          </li>
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
