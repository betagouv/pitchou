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
              <div class="definitions-in-card fr-mb-2w">
              <div class="definition-block">
                  <strong>Qu'est-ce qu'une décision administrative&nbsp;?</strong><br>
                  <span>Une décision administrative correspond à un arrêté de dérogation, un arrêté de refus, un arrêté modificatif ou tout autre document administratif finalisant l'instruction du dossier.</span>
              </div>
              </div>
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

    <!-- Bloc prescriptions contrôlées (barre) -->
    <section class="fr-mt-4w">
      <h2 class="fr-mt-2w">Prescriptions contrôlées</h2>
      <div class="fr-card fr-card--no-arrow stat-prescriptions-card">
        <div class="fr-card__body">
          <div class="fr-card__content">
            <div class="definitions-in-card fr-mb-2w">
              <div class="definition-block">
                <strong>Qu'est-ce qu'une prescription&nbsp;?</strong><br>
                <span>Une prescription est une exigence, mesure ou condition imposée par l’autorité administrative (ou parfois recommandée par l’instructeur du dossier) pour encadrer la réalisation d’un projet susceptible d’impacter des espèces protégées. Une prescription est soumise à des <strong>contrôles</strong>.</span>
              </div>
              <div class="definition-block">
                <strong>Qu'est-ce qu'un contrôle&nbsp;?</strong><br>
                <span>Un contrôle est vérification ou évaluation d’une <strong>prescription</strong>. Il permet de s’assurer que les conditions légales et réglementaires encadrant la protection des espèces protégées sont bien respectées. Un contrôle a deux états : <strong>conforme / non conforme</strong>.</span>
              </div>
            </div>
            <div class="progress-stats-wrapper">
              <div class="progress-labels">
                <div class="progress-label progress-label--left">
                  <span class="stat-number">{stats.nbPrescriptionsControlees}</span>
                  <span class="stat-label">Contrôlées<br>{stats.totalPrescriptions > 0 ? Math.round((stats.nbPrescriptionsControlees / stats.totalPrescriptions) * 100) : 0}%</span>
                </div>
                <div class="progress-label progress-label--right">
                  <span class="stat-number">{stats.totalPrescriptions - stats.nbPrescriptionsControlees}</span>
                  <span class="stat-label">Non contrôlées<br>{stats.totalPrescriptions > 0 ? 100 - Math.round((stats.nbPrescriptionsControlees / stats.totalPrescriptions) * 100) : 0}%</span>
                </div>
              </div>
              <div class="fr-progress-bar fr-mt-2w" style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden;">
                <div style="width: {stats.totalPrescriptions > 0 ? (stats.nbPrescriptionsControlees / stats.totalPrescriptions) * 100 : 0}%; background: var(--background-action-high-blue-france); height: 100%; display: inline-block;"></div>
                <div style="width: {stats.totalPrescriptions > 0 ? ((stats.totalPrescriptions - stats.nbPrescriptionsControlees) / stats.totalPrescriptions) * 100 : 0}%; background: var(--background-contrast-grey); height: 100%; display: inline-block;"></div>
              </div>
              <div class="progress-total fr-mt-1w">
                <span class="stat-label">Total prescriptions : <strong>{stats.totalPrescriptions}</strong></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <StatistiquesConformites statsConformite={stats.statsConformité} totalPrescriptions={stats.totalPrescriptions} />
  </article>
</div>

<style lang="scss">
  .fr-card,
  .stat-prescriptions-card {
    border: 1.5px solid var(--border-default-grey);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    background: var(--background-default-grey);
    max-width: 100vw;
    margin: 0 -16px 2.5rem -16px;
    padding: 2.5rem 2rem 2rem 2rem;
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
  .bar-prescriptions-ctrl {
    margin-bottom: 1.5rem;
  }
  .definitions,
  .definitions-in-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }
  .definitions-in-card .definition-block {
    background-color: var(--background-alt-grey);
    border-radius: 8px;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    margin-bottom: 0.75rem;
  }
  .definition-block strong {
    font-weight: bold;
    color: var(--text-default-info);
  }
  .definition-block span {
    font-size: 0.95rem;
    color: var(--text-mention-grey);
    margin-top: 0.5rem;
  }
  @media (max-width: 900px) {
    .fr-card,
    .stat-prescriptions-card {
      padding: 1.5rem 0.5rem 1rem 0.5rem;
      margin: 0 -8px 1.5rem -8px;
    }
  }
</style> 