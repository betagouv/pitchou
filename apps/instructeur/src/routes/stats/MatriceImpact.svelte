<script lang="ts"></script>

<section class="fr-mt-6w">
  <h2 class="fr-mt-2w">Matrice d'impact</h2>

  <div class="matrice-wrapper fr-mt-4w">
    <table class="matrice-table">
      <thead>
        <tr>
          <th class="th-empty" aria-hidden="true"></th>
          <th class="th-perimetre">Périmètre</th>
          <th class="th-indicateurs">Indicateurs</th>
          <th class="th-efficient">Efficient</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="td-niveau utilisable">Utilisable</td>
          <td rowspan="3" class="td-perimetre">Produit</td>
          <td class="td-indicateur rouge">
            Nombre de contacts support par mois (et nombre de personnes)
          </td>
          <td class="td-efficient td-efficient--vide"></td>
        </tr>
        <tr>
          <td class="td-niveau utilise">Utilisé</td>
          <td class="td-indicateur rouge">
            Nombre de personnes en rétention (la personne a renouvelé 5 actions de consultation ou
            de modification sur 7 jours glissants sur les 5 dernières semaines)
          </td>
          <td class="td-efficient"
            >Coût à l'usage&nbsp;: budget pitchou&nbsp;/ nombre de dossiers suivis</td
          >
        </tr>
        <tr>
          <td class="td-niveau utile">Utile</td>
          <td class="td-indicateur rouge">Nombre de personnes qui font des contrôles</td>
          <td class="td-efficient"
            >Coût à l'utilité&nbsp;: budget pitchou&nbsp;/ nombre de contrôles</td
          >
        </tr>
        <tr>
          <td class="td-niveau impactant">Impactant</td>
          <td class="td-perimetre">Politique publique</td>
          <td class="td-indicateur vert">
            Nombre de personnes ayant indiqué un retour à la conformité
          </td>
          <td class="td-efficient">
            Coût à l'impact&nbsp;: budget pitchou&nbsp;/&nbsp;nombre retours à la conformité
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</section>

<style lang="scss">
  .matrice-wrapper {
    overflow-x: auto;
  }

  .matrice-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.9rem;
  }

  .th-empty {
    width: 16%;
  }
  .th-perimetre {
    width: 16%;
  }
  .th-indicateurs {
    width: 38%;
  }
  .th-efficient {
    width: 30%;
  }

  thead th {
    padding: 0.75rem 1rem;
    text-align: center;
    font-weight: 600;
    border: 1px solid var(--border-default-grey);
  }

  .th-empty {
    background: transparent;
    border: none;
  }

  .th-perimetre,
  .th-indicateurs {
    background-color: var(--background-action-high-blue-france);
    color: var(--text-inverted-blue-france);
  }

  .th-efficient {
    background-color: var(--background-alt-yellow-moutarde);
  }

  .td-niveau {
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    font-size: 1.05rem;
    border: 2px solid;
    background: var(--background-default-grey);
  }

  .utilisable,
  .utilise,
  .utile {
    border-color: var(--border-plain-error);
    color: var(--text-default-error);
  }

  .impactant {
    border-color: var(--border-plain-success);
    color: var(--text-default-success);
  }

  .td-perimetre {
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    color: var(--text-title-blue-france);
    border: 1.5px solid var(--border-action-high-blue-france);
    background: var(--background-default-grey);
    vertical-align: middle;
  }

  .td-indicateur {
    padding: 0.85rem 1rem;
    vertical-align: top;
    font-size: 0.875rem;
    border: 1px solid var(--border-default-grey);
  }

  .td-indicateur.rouge {
    background-color: var(--background-flat-error);
    color: var(--text-inverted-error);
  }

  .td-indicateur.vert {
    background-color: var(--background-flat-success);
    color: var(--text-inverted-success);
  }

  .td-efficient {
    padding: 0.85rem 1rem;
    text-align: center;
    vertical-align: middle;
    font-size: 0.875rem;
    background-color: var(--background-alt-yellow-moutarde);
    border: 1px solid var(--border-default-yellow-moutarde);
  }

  .td-efficient--vide {
    background-color: var(--background-default-grey);
    border-color: var(--border-default-grey);
  }

  @media (max-width: 768px) {
    .matrice-table {
      font-size: 0.8rem;
    }

    thead th,
    .td-niveau,
    .td-perimetre,
    .td-indicateur,
    .td-efficient {
      padding: 0.5rem 0.6rem;
    }
  }
</style>
