<script>
  //@ts-check
  
  /** @import {StatsConformité} from '../../../types/database/public/Stats' */
  /** @type {StatsConformité} */
  export let statsConformite;

  const nbConformiteInitiale = statsConformite.nb_conforme_apres_1;
  const nbRetourConformite = statsConformite.nb_retour_conformite;
  const nbNonConforme = statsConformite.nb_non_conforme;
  const nbTropTard = statsConformite.nb_trop_tard;
  const nbAutre = statsConformite.nb_conformite_autre;
  const total = nbConformiteInitiale + nbRetourConformite + nbNonConforme + nbTropTard + nbAutre;
  const pctConformiteInitiale = total ? Math.round((nbConformiteInitiale/total)*100) : 0;
  const pctRetourConformite = total ? Math.round((nbRetourConformite/total)*100) : 0;
  const pctNonConforme = total ? Math.round((nbNonConforme/total)*100) : 0;
  const pctTropTard = total ? Math.round((nbTropTard/total)*100) : 0;
  const pctAutre = 100 - pctConformiteInitiale - pctRetourConformite - pctNonConforme - pctTropTard;
</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Statistiques conformités</h2>
  <div class="fr-card fr-card--no-arrow">
    <div class="fr-card__body">
      <div class="fr-card__content">
        <p class="fr-text--sm fr-mb-2w">
          Cette barre représente la répartition des prescriptions selon leur conformité après contrôle.
        </p>
        <div class="fr-mb-1w fr-grid-row fr-grid-row--gutters">
          <div class="fr-col-2">
            <span class="stat-number" style="color: var(--success-425-625);">{nbConformiteInitiale}</span>
            <span class="stat-label">Conformité initiale</span>
          </div>
          <div class="fr-col-2">
            <span class="stat-number" style="color: var(--green-emeraude-950-100-active);">{nbRetourConformite}</span>
            <span class="stat-label">Retour à la conformité</span>
          </div>
          <div class="fr-col-2">
            <span class="stat-number" style="color: var(--error-425-625);">{nbNonConforme}</span>
            <span class="stat-label">Non conforme</span>
          </div>
          <div class="fr-col-2">
            <span class="stat-number" style="color: var(--error-425-625);">{nbTropTard}</span>
            <span class="stat-label">Trop tard</span>
          </div>
          <div class="fr-col-2">
            <span class="stat-number" style="color: var(--background-contrast-grey);">{nbAutre}</span>
            <span class="stat-label">Non renseigné</span>
          </div>
        </div>
        <div class="fr-progress-bar fr-mt-2w" style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden; display: flex;">
          <div style="width: {pctConformiteInitiale}%; background: var(--success-425-625); height: 100%;"></div>
          <div style="width: {pctRetourConformite}%; background: var(--green-emeraude-950-100-active); height: 100%;"></div>
          <div style="width: {pctNonConforme}%; background: var(--red-marianne-main-472); height: 100%;"></div>
          <div style="width: {pctTropTard}%; background: var(--error-425-625); height: 100%;"></div>
          <div style="width: {pctAutre}%; background: var(--background-contrast-grey); height: 100%;"></div>
        </div>
        <div class="fr-mt-1w fr-text--xs fr-text--center">
          <span style="color: var(--success-425-625); font-weight: bold;">Conformité initiale</span> &nbsp;|&nbsp;
          <span style="color: var(--green-emeraude-950-100-active); font-weight: bold;">Retour à la conformité</span> &nbsp;|&nbsp;
          <span style="color: var(--red-marianne-main-472); font-weight: bold;">Non conforme</span> &nbsp;|&nbsp;
          <span style="color: var(--error-425-625); font-weight: bold;">Trop tard</span> &nbsp;|&nbsp;
          <span style="color: var(--background-contrast-grey); font-weight: bold;">Non renseigné</span>
        </div>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  .fr-card {
    border: 1px solid var(--border-default-grey);
    border-radius: 8px;
    padding: 1.5rem;
  }
  .stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 1rem;
    background-color: var(--background-alt-grey);
    border-radius: 6px;
  }
  .stat-number {
    font-size: 2rem;
    font-weight: bold;
    color: var(--text-default-info);
    display: block;
  }
  .stat-label {
    font-size: 0.875rem;
    color: var(--text-mention-grey);
    margin-top: 0.25rem;
  }
</style> 