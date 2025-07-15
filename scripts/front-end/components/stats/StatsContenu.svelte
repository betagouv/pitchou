<script>
  //@ts-check
  /** @import {StatsPubliques} from '../../../types/API_Pitchou' */
  import StatistiquesConformites from '../stats/StatistiquesConformites.svelte';
  /** @type {StatsPubliques} */
  export let stats

  const estimationNbPétitionnairesEnFranceParAn = 1500;

  const pourcentageAvecDécision = Math.round((stats.nbDossiersEnPhaseContrôleAvecDécision / stats.nbDossiersEnPhaseContrôle) * 100);
  const pourcentageSansDecision = 100 - pourcentageAvecDécision;
</script>

<div class="fr-grid-row fr-mt-6w fr-grid-row--center">
  <article class="fr-col">
    <header class="fr-mb-2w">
      <h1>Pitchou - Statistiques publiques</h1>
      <p class="fr-text--lg fr-mb-0">
        Ces données statistiques reposent sur un total de <strong>{stats.totalDossiers} dossiers </strong> enregistrés dans la base de données Pitchou.
      </p>
    </header>

    <section class="fr-mb-4w">
      <h2 class="fr-mt-2w">Activité sur Pitchou depuis septembre 2024</h2>
      <div class="fr-card fr-card--no-arrow">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="fr-grid-row fr-grid-row--gutters">
              <div class="fr-col-6">
                <div class="stat-item total-stat">
                  <span class="stat-number">{stats.nbPétitionnairesDepuisSept2024}</span>
                  <span class="stat-label">Pétitionnaires dans Pitchou<br><span class="fr-text--xs">(depuis 09/2024)</span></span>
                </div>
              </div>
              <div class="fr-col-6">
                <div class="stat-item">
                  <span class="stat-number">{estimationNbPétitionnairesEnFranceParAn}</span>
                  <span class="stat-label">Pétitionnaires en France<br><span class="fr-text--xs">(référence)</span></span>
                </div>
              </div>
            </div>
            <p class="fr-text--sm fr-mt-2w">
              Ces chiffres correspondent à l'activité sur Pitchou depuis septembre 2024. 
              L'estimation France entière est indicative.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section>
      <h2 class="fr-mt-2w">Répartition des dossiers en phase <strong>Contrôle</strong> avec et sans décision adminsistrative</h2>
      <div class="fr-card fr-card--no-arrow">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <p class="fr-text--sm fr-mb-2w">
              Une <strong>décision administrative</strong> correspond à un arrêté de dérogation, un arrêté de refus, un arrêté modificatif ou tout autre document administratif finalisant l'instruction du dossier.
            </p>
            <div class="progress-stats-wrapper">
              <div class="progress-labels">
                <div class="progress-label progress-label--left">
                  <span class="stat-number">{stats.nbDossiersEnPhaseContrôleAvecDécision}</span>
                  <span class="stat-label">Avec décision<br>{pourcentageAvecDécision}%</span>
                </div>
                <div class="progress-label progress-label--right">
                  <span class="stat-number">{stats.nbDossiersEnPhaseContrôleSansDécision}</span>
                  <span class="stat-label">Sans décision<br>{pourcentageSansDecision}%</span>
                </div>
              </div>
              <div class="fr-progress-bar fr-mt-2w" style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden;">
                <div style="width: {pourcentageAvecDécision}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"></div>
                <div style="width: {pourcentageSansDecision}%; background: var(--background-contrast-grey); height: 100%; display: inline-block;"></div>
              </div>
              <div class="progress-total fr-mt-1w">
                <span class="stat-label">Total dossiers en phase Contrôle : <strong>{stats.nbDossiersEnPhaseContrôle}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="fr-mt-4w">
      <h2 class="fr-mt-2w">Nombre de contrôles dans Pitchou</h2>
      <div class="fr-card fr-card--no-arrow">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <p class="fr-text--sm fr-mb-2w">
              Un contrôle désigne une vérification et une évaluation permettant de s’assurer que les conditions légales et réglementaires encadrant la protection des espèces protégées sont bien respectées.
            </p>
            <div class="fr-grid-row fr-grid-row--gutters">
              <div class="fr-col-4">
                <div class="stat-item total-stat">
                  <span class="stat-number">{stats.totalContrôles}</span>
                  <span class="stat-label">contrôles</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <StatistiquesConformites statsConformite={stats.statsConformité} />
  </article>
</div>

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
  .stat-item.total-stat {
    background-color: var(--background-action-high-blue-france);
    color: white;
  }
  .stat-item.total-stat .stat-number {
    color: white;
  }
  .stat-item.total-stat .stat-label {
    color: white;
  }
  .progress-stats-wrapper {
    width: 100%;
    margin: 2rem 0 1rem 0;
  }
  .progress-labels {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .progress-label {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-size: 1rem;
  }
  .progress-label--left .stat-number {
    color: var(--text-default-info);
  }
  .progress-label--right .stat-number {
    color: var(--text-mention-grey);
  }
  .progress-total {
    text-align: center;
    margin-top: 0.5rem;
  }
</style> 