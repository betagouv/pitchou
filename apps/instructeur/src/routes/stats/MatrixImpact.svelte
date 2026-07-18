<script lang="ts"></script>

<section class="fr-mt-6w">
  <h2 class="fr-mt-2w">Matrice d'impact</h2>

  <div class="matrix-wrapper fr-mt-4w">
    <table class="matrix-table">
      <thead>
        <tr>
          <th class="th-empty" aria-hidden="true"></th>
          <th class="th-perimeter">Périmètre</th>
          <th class="th-indicators">Indicateurs</th>
          <th class="th-efficient">Efficient</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="td-level usable">Utilisable</td>
          <td rowspan="3" class="td-perimeter">Produit</td>
          <td class="td-indicator red">
            Nombre de contacts support par mois (et nombre de personnes)
          </td>
          <td class="td-efficient td-efficient--empty"></td>
        </tr>
        <tr>
          <td class="td-level used">Utilisé</td>
          <td class="td-indicator red">
            Nombre de personnes en rétention (la personne a renouvelé 5 actions de consultation ou
            de modification sur 7 jours glissants sur les 5 dernières semaines)
          </td>
          <td class="td-efficient"
            >Coût à l'usage&nbsp;: budget pitchou&nbsp;/ nombre de dossiers suivis</td
          >
        </tr>
        <tr>
          <td class="td-level useful">Utile</td>
          <td class="td-indicator red">Nombre de personnes qui font des contrôles</td>
          <td class="td-efficient"
            >Coût à l'utilité&nbsp;: budget pitchou&nbsp;/ nombre de contrôles</td
          >
        </tr>
        <tr>
          <td class="td-level impactful">Impactant</td>
          <td class="td-perimeter">Politique publique</td>
          <td class="td-indicator green">
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
  .matrix-wrapper {
    overflow-x: auto;
  }

  .matrix-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 0.9rem;
  }

  .th-empty {
    width: 16%;
  }
  .th-perimeter {
    width: 16%;
  }
  .th-indicators {
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

  .th-perimeter,
  .th-indicators {
    background-color: var(--background-action-high-blue-france);
    color: var(--text-inverted-blue-france);
  }

  .th-efficient {
    background-color: var(--background-alt-yellow-moutarde);
  }

  .td-level {
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    font-size: 1.05rem;
    border: 2px solid;
    background: var(--background-default-grey);
  }

  .usable,
  .used,
  .useful {
    border-color: var(--border-plain-error);
    color: var(--text-default-error);
  }

  .impactful {
    border-color: var(--border-plain-success);
    color: var(--text-default-success);
  }

  .td-perimeter {
    padding: 1rem;
    text-align: center;
    font-weight: 600;
    color: var(--text-title-blue-france);
    border: 1.5px solid var(--border-action-high-blue-france);
    background: var(--background-default-grey);
    vertical-align: middle;
  }

  .td-indicator {
    padding: 0.85rem 1rem;
    vertical-align: top;
    font-size: 0.875rem;
    border: 1px solid var(--border-default-grey);
  }

  .td-indicator.red {
    background-color: var(--background-flat-error);
    color: var(--text-inverted-error);
  }

  .td-indicator.green {
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

  .td-efficient--empty {
    background-color: var(--background-default-grey);
    border-color: var(--border-default-grey);
  }

  @media (max-width: 768px) {
    .matrix-table {
      font-size: 0.8rem;
    }

    thead th,
    .td-level,
    .td-perimeter,
    .td-indicator,
    .td-efficient {
      padding: 0.5rem 0.6rem;
    }
  }
</style>
