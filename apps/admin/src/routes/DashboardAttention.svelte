<script lang="ts">
  import type { PageData } from "./$types";

  let { attention }: { attention: PageData["attention"] } = $props();
  const items = $derived(
    [
      {
        count: attention.groups?.unmatchedDossiers ?? 0,
        title: "Dossiers sans groupe",
        detail: "Compléter le département principal ou la couverture des groupes.",
        href: "/dossiers#unmatched-dossiers",
        icon: "fr-icon-folder-2-line",
      },
      {
        count: attention.activityLabels,
        title: "Libellés d'activité à vérifier",
        detail: "Confirmer ou corriger leur rattachement à une activité.",
        href: "/activites",
        icon: "fr-icon-briefcase-line",
      },
      {
        count: attention.groups?.toReview ?? 0,
        title: "Groupes à vérifier",
        detail: "Vérifier les départements importés, puis enregistrer le groupe.",
        href: "/groupes-instructeurs#groups-to-review",
        icon: "fr-icon-team-line",
      },
      {
        count: attention.groups?.uncoveredDepartments ?? 0,
        title: "Départements sans groupe actif",
        detail: "Compléter la couverture pour affecter les dossiers de ces départements.",
        href: "/groupes-instructeurs#uncovered-departments",
        icon: "fr-icon-map-pin-2-line",
      },
    ].filter((item) => item.count > 0),
  );
</script>

<section class="admin-panel" aria-labelledby="attention-title">
  <h2 id="attention-title">À votre attention</h2>
  {#if items.length}
    <ul class="attention-grid">
      {#each items as item (item.title)}
        <li>
          <a class="fr-raw-link attention-link" href={item.href}>
            <div class="card-heading">
              <span class="{item.icon} fr-icon--sm" aria-hidden="true"></span>
              <span class="count">{item.count}</span>
              <span class="fr-icon-arrow-right-line fr-icon--sm arrow" aria-hidden="true"></span>
            </div>
            <h3>{item.title}</h3>
            <p>{item.detail}</p>
          </a>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="all-clear">
      <span class="fr-icon-checkbox-circle-line" aria-hidden="true"></span>
      <div>
        <h3>Tout est à jour</h3>
        <p>Aucun point à traiter dans les rubriques auxquelles vous avez accès.</p>
      </div>
    </div>
  {/if}
</section>

<style>
  .attention-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr));
    gap: 0.75rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    padding: 0;
  }
  .attention-link {
    display: block;
    height: 100%;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-default-grey);
    color: var(--text-default-grey);
  }
  .attention-link:hover {
    background: var(--background-alt-grey-hover);
    border-color: var(--border-action-high-blue-france);
  }
  .card-heading {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    color: var(--text-default-warning);
  }
  .count {
    padding: 0.125rem 0.5rem;
    border-radius: 0.375rem;
    background: var(--background-contrast-warning);
    font-size: 0.875rem;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .arrow {
    margin-left: auto;
    color: var(--text-mention-grey);
  }
  h3 {
    margin: 0 0 0.375rem;
    font-size: 0.9375rem;
    line-height: 1.5;
  }
  p {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--text-mention-grey);
  }
  .all-clear {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem;
  }
  .all-clear > span {
    flex-shrink: 0;
    color: var(--text-default-success);
  }
</style>
