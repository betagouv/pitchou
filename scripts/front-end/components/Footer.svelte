<script lang="ts">
  import { differenceInMinutes, format } from "date-fns";
  import { fr } from "date-fns/locale";
  import { onMount } from "svelte";

  import type { PitchouState } from "../store.svelte.ts";

  const BUDGET_URL =
    "https://docs.google.com/spreadsheets/d/1E1z_SMXquqVnKvJXy7yKdGk1YPdV58_oaoLxBtf_k7s/edit?gid=0#gid=0";

  type Props = {
    résultatsSynchronisationDS88444?: PitchouState["résultatsSynchronisationDS88444"];
  };

  let { résultatsSynchronisationDS88444 = undefined }: Props = $props();

  let dernièreSynchronisationRéussie = $derived(
    résultatsSynchronisationDS88444 && résultatsSynchronisationDS88444.find((r) => r.succès),
  );

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

  let theme = $state<"light" | "dark">("light");

  onMount(() => {
    const root = document.documentElement;
    const sync = () => {
      theme = root.getAttribute("data-fr-theme") === "dark" ? "dark" : "light";
    };
    sync();
    // DSFR met à jour data-fr-theme en fonction de data-fr-scheme ; on suit cet attribut
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-fr-theme"] });
    return () => observer.disconnect();
  });

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute("data-fr-theme") === "dark" ? "light" : "dark";
    // DSFR observe data-fr-scheme, applique data-fr-theme et persiste le choix
    root.setAttribute("data-fr-scheme", next);
  }
</script>

<footer class="fr-footer fr-mt-2w" id="footer">
  <div class="fr-container">
    <div class="fr-footer__body">
      <div class="fr-footer__brand fr-enlarge-link">
        <p class="fr-logo">République <br />Française</p>
      </div>
      <div class="fr-footer__content">
        <ul class="fr-footer__content-list">
          <li class="fr-footer__content-item">
            <a
              class="fr-footer__content-link"
              target="_blank"
              rel="noopener external"
              title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
              href="https://legifrance.gouv.fr">legifrance.gouv.fr</a
            >
          </li>
          <li class="fr-footer__content-item">
            <a
              class="fr-footer__content-link"
              target="_blank"
              rel="noopener external"
              title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
              href="https://gouvernement.fr">gouvernement.fr</a
            >
          </li>
          <li class="fr-footer__content-item">
            <a
              class="fr-footer__content-link"
              target="_blank"
              rel="noopener external"
              title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
              href="https://service-public.fr">service-public.fr</a
            >
          </li>
          <li class="fr-footer__content-item">
            <a
              class="fr-footer__content-link"
              target="_blank"
              rel="noopener external"
              title="[À MODIFIER - Intitulé] - nouvelle fenêtre"
              href="https://data.gouv.fr">data.gouv.fr</a
            >
          </li>
        </ul>
      </div>
    </div>
    <div class="fr-footer__bottom">
      <ul class="fr-footer__bottom-list">
        <li class="fr-footer__bottom-item">
          <a
            class="fr-footer__bottom-link fr-icon-external-link-line fr-link--icon-right"
            href="https://github.com/betagouv/pitchou"
            target="_blank"
            rel="noopener external"
            title="Code source - nouvelle fenêtre">Code source</a
          >
        </li>
        <li class="fr-footer__bottom-item">
          <a href="/stats" class="fr-footer__bottom-link"> Statistiques </a>
        </li>
        <li class="fr-footer__bottom-item">
          <a
            href={BUDGET_URL}
            class="fr-footer__bottom-link fr-icon-external-link-line fr-link--icon-right"
            target="_blank"
            rel="noopener external"
            title="Budget - nouvelle fenêtre"
          >
            Budget
          </a>
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
            type="button"
            class="fr-footer__bottom-link fr-icon-{theme === 'dark'
              ? 'sun'
              : 'moon'}-line fr-link--icon-left"
            onclick={toggleTheme}
          >
            {theme === "dark" ? "Thème clair" : "Thème sombre"}
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
