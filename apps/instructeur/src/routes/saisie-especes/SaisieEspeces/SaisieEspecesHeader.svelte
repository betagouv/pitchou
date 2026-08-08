<script lang="ts">
  type Props = { readingMode: boolean };
  let { readingMode = $bindable() }: Props = $props();
</script>

<header class="flex flex-row justify-between items-center fr-mt-4w">
  <h1>Espèces protégées impactées</h1>
  <div class="fr-toggle">
    <input
      bind:checked={readingMode}
      type="checkbox"
      class="fr-toggle__input"
      id="toggle-mode-lecture"
    /><label class="fr-toggle__label w-full" for="toggle-mode-lecture">Mode lecture</label>
  </div>
  <div aria-live="polite" aria-atomic="true" class="fr-sr-only">
    {readingMode
      ? "Mode lecture activé. Les espèces sont maintenant affichées regroupées par type d'impact."
      : "Mode lecture désactivé. Vous pouvez modifier les espèces et leurs impacts."}
  </div>
  <div class="fr-translate fr-nav">
    <div class="fr-nav__item">
      <button
        aria-controls="methodes-preremplissage"
        aria-expanded="false"
        title="Choisir une méthode de pré-remplissage"
        type="button"
        class="fr-btn fr-btn--tertiary">Pré-remplir</button
      >
      <div class="fr-collapse fr-translate__menu fr-menu" id="methodes-preremplissage">
        <ul class="fr-menu__list">
          <li>
            <button
              class="fr-translate__language fr-btn fr-btn--secondary fr-nav__link"
              type="button"
              data-fr-opened="false"
              aria-controls="modale-préremplir-depuis-import">Importer un document .ods</button
            >
          </li>
          <li>
            <button
              class="fr-btn fr-btn--secondary fr-translate__language fr-nav__link"
              type="button"
              data-fr-opened="false"
              aria-controls="modale-préremplir-depuis-texte">Pré-remplir depuis un texte</button
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</header>
<p class="fr-mt-1w fr-mb-2w">
  <a
    href="/referentiel-type-impact"
    target="_blank"
    rel="noopener"
    title="Référentiel des types d'impact et de leurs critères - nouvelle fenêtre"
    class="fr-link fr-icon-question-line fr-link--icon-left fr-text--sm"
    >Quels types d'impact existe-t-il, et quels critères peut-on renseigner pour chacun&nbsp;?</a
  >
</p>
