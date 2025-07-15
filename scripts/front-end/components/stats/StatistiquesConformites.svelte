<script>

  //@ts-check
  
  /** @import {StatsConformité} from '../../../types/database/public/Stats' */
  /** @type {StatsConformité} */
  export let statsConformite;

  /** @type {number} */
  export let totalPrescriptions;

  const nbConformiteInitiale = statsConformite.nb_conforme_apres_1;
  const nbRetourConformite = statsConformite.nb_retour_conformite;
  const nbNonConforme = statsConformite.nb_non_conforme;
  const nbTropTard = statsConformite.nb_trop_tard;

  const pctConformiteInitiale = totalPrescriptions ? Math.round((nbConformiteInitiale/totalPrescriptions)*100) : 0;
  const pctRetourConformite = totalPrescriptions ? Math.round((nbRetourConformite/totalPrescriptions)*100) : 0;
  const pctNonConforme = totalPrescriptions ? Math.round((nbNonConforme/totalPrescriptions)*100) : 0;
  const pctTropTard = totalPrescriptions ? Math.round((nbTropTard/totalPrescriptions)*100) : 0;

  const nbPasEncoreFinalise = totalPrescriptions - (
    nbConformiteInitiale + nbRetourConformite + nbNonConforme + nbTropTard
  );

</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Impacts des contrôles de prescription sur la biodiversité</h2>
  <div class="fr-card fr-card--no-arrow stat-conformite-card">
    <div class="fr-card__body">
      <div class="fr-card__content">
        <!-- Chiffres principaux -->
        <div class="fr-mb-1w fr-grid-row fr-grid-row--gutters chiffres-conformite">
          <div class="fr-col-3 chiffre-item">
            <span class="stat-number" style="color: var(--success-425-625);">{nbConformiteInitiale}</span>
            <span class="stat-label">Conformité initiale</span>
          </div>
          <div class="fr-col-3 chiffre-item">
            <span class="stat-number" style="color: var(--green-emeraude-950-100-active);">{nbRetourConformite}</span>
            <span class="stat-label">Retour à la conformité</span>
          </div>
          <div class="fr-col-3 chiffre-item">
            <span class="stat-number" style="color: var(--red-marianne-main-472);">{nbNonConforme}</span>
            <span class="stat-label">Non conforme</span>
          </div>
          <div class="fr-col-3 chiffre-item">
            <span class="stat-number" style="color: #000;">{nbTropTard}</span>
            <span class="stat-label">Trop tard</span>
          </div>
        </div>
        <!-- Bar chart -->
        <div class="fr-progress-bar fr-mt-2w bar-conformite" style="height: 1.5rem; background: var(--background-alt-grey); border-radius: 8px; overflow: hidden; display: flex;">
          <div style="width: {pctConformiteInitiale}%; background: var(--success-425-625); height: 100%; transition: width 0.5s;"></div>
          <div style="width: {pctRetourConformite}%; background: var(--green-emeraude-950-100-active); height: 100%; transition: width 0.5s;"></div>
          <div style="width: {pctNonConforme}%; background: var(--red-marianne-main-472); height: 100%; transition: width 0.5s;"></div>
          <div style={`width: ${pctTropTard}%; background: #000; height: 100%; transition: width 0.5s;`}></div>
        </div>
        <!-- Légende horizontale -->
        <div class="fr-mt-3w fr-text--xs fr-text--center legend-horizontal-uiux">
          <div class="legend-item"><span class="legend-dot" style="background: var(--success-425-625);"></span><span class="legend-label"><strong>Conformité initiale</strong> : prescriptions conformes dès le 1<sup>er</sup> contrôle.</span> <span class="legend-count">{nbConformiteInitiale}</span></div>
          <div class="legend-item"><span class="legend-dot" style="background: var(--green-emeraude-950-100-active);"></span><span class="legend-label"><strong>Retour à la conformité</strong> : prescriptions ayant eu plus d'un contrôle et dont le dernier contrôle est "Conforme".</span> <span class="legend-count">{nbRetourConformite}</span></div>
          <div class="legend-item"><span class="legend-dot" style="background: var(--red-marianne-main-472);"></span><span class="legend-label"><strong>Non conforme</strong> : prescriptions dont le dernier contrôle est "Non conforme".</span> <span class="legend-count">{nbNonConforme}</span></div>
          <div class="legend-item"><span class="legend-dot" style="background: #000;"></span><span class="legend-label"><strong>Trop tard</strong> : prescriptions dont le dernier contrôle a un résultat "Trop tard".</span> <span class="legend-count">{nbTropTard}</span></div>
          <div class="legend-item"><span class="legend-dot" style="background: var(--background-contrast-grey);"></span><span class="legend-label"><strong>Pas encore finalisé</strong> (manque d’infos)</span> <span class="legend-count">{nbPasEncoreFinalise}</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  .stat-conformite-card {
    border: 1.5px solid var(--border-default-grey);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    background: var(--background-default-grey);
    max-width: 100vw;
    margin: 0 -16px 2.5rem -16px;
    padding: 2.5rem 2rem 2rem 2rem;
  }
  .definitions {
    display: flex;
    flex-direction: row;
    gap: 2.5rem;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.5rem;
    background: var(--background-alt-grey);
    border-radius: 8px;
    padding: 1.25rem 1rem;
    font-size: 1rem;
    color: var(--text-default-grey);
  }
  .definition-block {
    flex: 1 1 0;
    min-width: 0;
    margin-right: 1.5rem;
  }
  .definition-block:last-child {
    margin-right: 0;
  }
  .synthese-prescriptions {
    color: var(--text-default-info);
    background: none;
    border-radius: 0;
    padding: 0.75rem 1rem 0.5rem 1rem;
    margin-bottom: 1.5rem;
    text-align: center;
    font-size: 1.1rem;
    letter-spacing: 0.01em;
  }
  .chiffres-conformite {
    margin-bottom: 1.5rem;
    text-align: center;
  }
  .chiffre-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.5rem;
    background: none;
    border-radius: 8px;
    margin: 0 0.5rem;
    box-shadow: none;
    min-width: 120px;
  }
  .stat-number {
    font-size: 2.2rem;
    font-weight: 700;
    color: var(--text-default-info);
    margin-bottom: 0.25rem;
    letter-spacing: 0.01em;
  }
  .stat-label {
    font-size: 1rem;
    color: var(--text-mention-grey);
    margin-top: 0.15rem;
    font-weight: 500;
  }
  .bar-conformite {
    margin: 1.5rem 0 2rem 0;
    box-shadow: none;
    background: var(--background-alt-grey);
    border-radius: 8px;
  }
  .legend-horizontal-uiux {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    margin-top: 2rem;
    background: none;
    border-radius: 0;
    padding: 1rem 1.5rem 0 1.5rem;
    max-width: 100vw;
    margin-left: auto;
    margin-right: auto;
    box-shadow: none;
    flex-wrap: wrap;
  }
  .legend-horizontal-uiux .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 1rem;
    color: var(--text-default-grey);
    margin-bottom: 0.5rem;
  }
  .legend-horizontal-uiux .legend-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    display: inline-block;
    margin-right: 0.5rem;
    border: 2px solid var(--border-default-grey);
    box-shadow: 0 1px 2px rgba(0,0,0,0.04);
  }
  .legend-horizontal-uiux .legend-label {
    font-size: 1rem;
    color: var(--text-default-grey);
  }
  .legend-horizontal-uiux .legend-count {
    font-weight: bold;
    margin-left: 0.5rem;
    color: var(--text-default-info);
  }
  @media (max-width: 900px) {
    .stat-conformite-card {
      padding: 1.5rem 0.5rem 1rem 0.5rem;
      margin: 0 -8px 1.5rem -8px;
    }
    .definitions {
      flex-direction: column;
      gap: 1.25rem;
      padding: 1rem 0.5rem;
    }
    .legend-horizontal-uiux {
      padding: 0.75rem 0.5rem 0 0.5rem;
    }
    .chiffre-item {
      min-width: 90px;
      padding: 0.75rem 0.25rem;
    }
  }
</style> 