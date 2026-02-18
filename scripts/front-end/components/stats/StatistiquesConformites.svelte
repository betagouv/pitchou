<script>
  /** @import {StatsConformité} from '../../../types/API_Pitchou' */
  
  /**
   * @typedef {Object} Props
   * @property {StatsConformité} statsConformite
   * @property {number} totalPrescriptions
   */

  /** @type {Props} */
  let { statsConformite, totalPrescriptions } = $props();

  const nbConformiteInitiale = statsConformite.nb_conforme_apres_1;
  const nbRetourConformite = statsConformite.nb_retour_conformite;
  const nbNonConforme = statsConformite.nb_non_conforme;
  const nbTropTard = statsConformite.nb_trop_tard;
  const nbAutre = totalPrescriptions - (nbConformiteInitiale+nbRetourConformite+nbNonConforme+nbTropTard);

  const pctConformiteInitiale = totalPrescriptions ? Math.round((nbConformiteInitiale/totalPrescriptions)*100) : 0;
  const pctRetourConformite = totalPrescriptions ? Math.round((nbRetourConformite/totalPrescriptions)*100) : 0;
  const pctNonConforme = totalPrescriptions ? Math.round((nbNonConforme/totalPrescriptions)*100) : 0;
  const pctTropTard = totalPrescriptions ? Math.round((nbTropTard/totalPrescriptions)*100) : 0;

</script>

<section class="fr-mt-4w">
  <h2 class="fr-mt-2w">Conformité des prescriptions contrôlables dans Pitchou</h2>
  <div class="fr-card fr-card--no-arrow stat-conformite-card">
    <div class="fr-card__body">
      <div class="fr-card__content">

        <div class="chiffres-conformite">
          <div class="chiffre-item conformité-initiale">
            <span class="stat-number">{nbConformiteInitiale}</span>
            <span class="stat-label">Conformité initiale</span>
          </div>
          <div class="chiffre-item retour-à-la-conformité">
            <span class="stat-number">{nbRetourConformite}</span>
            <span class="stat-label">Retour à la conformité</span>
          </div>
          <div class="chiffre-item non-conforme">
            <span class="stat-number">{nbNonConforme}</span>
            <span class="stat-label">Non conforme</span>
          </div>
          <div class="chiffre-item trop-tard">
            <span class="stat-number">{nbTropTard}</span>
            <span class="stat-label">Trop tard</span>
          </div>
          <div class="chiffre-item autre">
            <span class="stat-number">{nbAutre}</span>
            <span class="stat-label">Autre</span>
          </div>
        </div>

        <div class="fr-progress-bar fr-mt-2w bar-conformite">
          <div class="conformité-initiale" style:width="{pctConformiteInitiale}%"></div>
          <div class="retour-à-la-conformité" style:width="{pctRetourConformite}%"></div>
          <div class="non-conforme" style:width="{pctNonConforme}%"></div>
          <div class="trop-tard" style:width="{pctTropTard}%"></div>
        </div>

        <div class="legend-conformite">
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot conformité-initiale"></span>
            <span><strong>Conformité initiale</strong> : Prescription validée dès le 1<sup>er</sup> contrôle.</span>
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot retour-à-la-conformité"></span>
            <span><strong>Retour à la conformité</strong> : Prescription validée après au moins 2 contrôles.</span>
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot non-conforme"></span>
            <span><strong>Non conforme</strong> : Prescription dont le dernier contrôle est "Non conforme".</span>
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot trop-tard"></span>
            <span><strong>Trop tard</strong> : Prescription pour laquelle il n'est plus possible de retour à la conformité.</span>
          </div>
          <div class="legend-conformite-item">
            <span class="legend-conformite-dot autre"></span>
            <span><strong>Autre</strong> : Pas encore finalisé/manque d'information/non renseigné.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<style lang="scss">
  $couleur-conformité-initiale: var(--success-425-625);
  $couleur-retour-à-la-conformité: var(--green-emeraude-950-100-active);
  $couleur-non-conforme: var(--red-marianne-main-472);
  $couleur-trop-tard: var(--grey-50-1000);
  $couleur-autre: var(--text-disabled-grey);


  .stat-conformite-card {
    border: 1.5px solid var(--border-default-grey);
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
    background: var(--background-default-grey);
    max-width: 100vw;
    margin: 0 -16px 2.5rem -16px;
    padding: 2.5rem 2rem 2rem 2rem;
  }

  .chiffres-conformite {
    text-align: center;
    display: flex;
    justify-content: space-around;
    width: 100%;
    margin-bottom: 2rem;

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

      .stat-number {
        font-size: 2.2rem;
        font-weight: 700;
        color: var(--text-default-info);
        margin-bottom: 0.25rem;
        letter-spacing: 0.01em;
      }

      &.conformité-initiale .stat-number{
        color: $couleur-conformité-initiale;
      }
      &.retour-à-la-conformité .stat-number{
        color: $couleur-retour-à-la-conformité;
      }
      &.non-conforme .stat-number{
        color: $couleur-non-conforme;
      }
      &.trop-tard .stat-number{
        color: $couleur-trop-tard;
      }
      &.autre .stat-number{
        color: $couleur-autre;
      }

      .stat-label {
        font-size: 1rem;
        color: var(--text-mention-grey);
        margin-top: 0.15rem;
        font-weight: 500;
      }
    }

  }
  
  

  
  .bar-conformite {
    display: flex;
    margin: 1.5rem 0 2rem 0;
    box-shadow: none;
    background: $couleur-autre;
    border-radius: 8px;

    height: 1.5rem;

    & > div{
      height: 100%; 
      transition: width 0.5s;
    }

    .conformité-initiale{
      background: $couleur-conformité-initiale;
    }
    .retour-à-la-conformité{
      background: $couleur-retour-à-la-conformité;
    }
    .non-conforme{
      background: $couleur-non-conforme;
    }
    .trop-tard{
      background: $couleur-trop-tard;
    }

  }
  
  
  .legend-conformite {
    font-size: small;

    .legend-conformite-dot {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      display: inline-block;
      margin-right: 0.5rem;
      border: 2px solid var(--border-default-grey);
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);


      &.conformité-initiale{
        background: $couleur-conformité-initiale;
      }
      &.retour-à-la-conformité{
        background: $couleur-retour-à-la-conformité;
      }
      &.non-conforme{
        background: $couleur-non-conforme;
      }
      &.trop-tard{
        background: $couleur-trop-tard;
      }
      &.autre{
        background: $couleur-autre;
      }
    }
  }
  

  @media (max-width: 900px) {
    .stat-conformite-card {
      padding: 1.5rem 0.5rem 1rem 0.5rem;
      margin: 0 -8px 1.5rem -8px;
    }
    .chiffre-item {
      min-width: 90px;
      padding: 0.75rem 0.25rem;
    }
  }
</style> 