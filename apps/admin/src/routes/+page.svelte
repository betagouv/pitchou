<script lang="ts">
  import type { PageData } from "./$types";
  import DashboardAttention from "./DashboardAttention.svelte";

  let { data }: { data: PageData } = $props();
</script>

<div class="admin-stack">
  <DashboardAttention attention={data.attention} />
  <section class="admin-panel" aria-labelledby="resources-title">
    <h2 id="resources-title">Ressources de l'équipe</h2>
    {#if data.links.length > 0}
      <ul class="resource-grid">
        {#each data.links as link (link.title)}
          <li>
            <a
              href={link.href}
              target="_blank"
              rel="noopener external"
              class="fr-raw-link resource-link"
            >
              <span class="resource-icon {link.icon} fr-icon--sm" aria-hidden="true"></span>
              <span class="resource-copy"
                ><strong>{link.title}</strong><span>{link.detail}</span></span
              >
              <span class="fr-icon-external-link-line fr-icon--sm" aria-hidden="true"></span>
              <span class="sr-only">Nouvel onglet</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}<p class="admin-empty">Aucune ressource disponible pour le moment.</p>{/if}
  </section>
</div>

<style>
  .resource-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 0.75rem;
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .resource-grid li {
    padding: 0;
  }
  .resource-link {
    display: flex;
    align-items: center;
    height: 100%;
    gap: 0.875rem;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    color: var(--text-default-grey);
    background: var(--background-default-grey);
  }
  .resource-link:hover {
    background: var(--background-alt-grey-hover);
    border-color: var(--border-action-high-blue-france);
  }
  .resource-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    flex-shrink: 0;
    border-radius: 0.5rem;
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
  }
  .resource-copy {
    display: flex;
    flex: 1;
    min-width: 0;
    flex-direction: column;
    gap: 0.25rem;
  }
  strong {
    font-size: 0.875rem;
    font-weight: 600;
  }
  .resource-copy > span {
    font-size: 0.8125rem;
    color: var(--text-mention-grey);
  }
</style>
