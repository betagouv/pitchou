<script lang="ts">
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();
</script>

<h1 class="fr-mb-1w">Tableau de bord</h1>
<p class="fr-text--lead fr-mb-4w">Accès rapide aux outils de l'équipe Pitchou.</p>

{#if data.links.length > 0}
  <ul class="dashboard-grid">
    {#each data.links as link (link.title)}
      <li>
        <div class="fr-tile fr-tile--sm fr-tile--horizontal fr-enlarge-link">
          <div class="fr-tile__body">
            <div class="fr-tile__content">
              <h2 class="fr-tile__title">
                <a href={link.href} target="_blank" rel="noopener external">{link.title}</a>
              </h2>
              <p class="fr-tile__detail">{link.detail}</p>
            </div>
          </div>
          <div class="fr-tile__header">
            <div class="fr-tile__pictogram">
              <span class="dashboard-tile__icon {link.icon}" aria-hidden="true"></span>
            </div>
          </div>
        </div>
      </li>
    {/each}
  </ul>
{:else}
  <p>
    Aucun lien configuré. Renseignez les variables <code>URL_*</code> dans le fichier
    <code>.env</code>.
  </p>
{/if}

<style lang="scss">
  // Plain CSS grid so spacing lives only in the gaps, never around the edges.
  .dashboard-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 1.5rem;
    grid-template-columns: 1fr;
  }

  @media (min-width: 36em) {
    .dashboard-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  @media (min-width: 48em) {
    .dashboard-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  // Let each tile fill its grid cell so cards in a row share the same height.
  .dashboard-grid li {
    display: flex;
  }

  .dashboard-grid :global(.fr-tile) {
    width: 100%;
  }

  .dashboard-tile__icon::before {
    --icon-size: 2rem;
    width: 2rem;
    height: 2rem;
    color: var(--text-action-high-blue-france);
  }

  // Vertically center the pictogram against the text block.
  .dashboard-grid :global(.fr-tile--horizontal) {
    align-items: center;
  }

  // Show the external-link icon inline, right after the title, instead of pinned
  // to the bottom-right corner — and reclaim the space DSFR reserves for it.
  .dashboard-grid :global(.fr-tile.fr-tile--sm.fr-enlarge-link .fr-tile__title a::after) {
    position: static;
  }

  .dashboard-grid :global(.fr-tile.fr-tile--sm.fr-enlarge-link .fr-tile__content) {
    padding-bottom: 0;
  }

  .dashboard-grid :global(.fr-tile.fr-tile--sm.fr-enlarge-link .fr-tile__detail) {
    margin-bottom: 0;
  }
</style>
