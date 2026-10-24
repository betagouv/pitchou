<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import DemandeDetail from "./DemandeDetail.svelte";
  let { data }: { data: PageData } = $props();
  let currentPage = $derived(Math.max(1, Number(page.url.searchParams.get("page")) || 1));
  function link(values: Record<string, string>) {
    const params = new URLSearchParams(page.url.searchParams.toString());
    for (const [key, value] of Object.entries(values)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    return `?${params}`;
  }
  function open(event: MouseEvent) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey || event.button !== 0)
      return;
    event.preventDefault();
    void goto((event.currentTarget as HTMLAnchorElement).href, { reset: false });
  }
</script>

<section class="admin-panel">
  <h2>Demandes et projets du dump</h2>
  <form class="onagre-controls" method="GET">
    <input type="hidden" name="tab" value="dossiers" /><input
      type="hidden"
      name="snapshot"
      value={data.selected?.id ?? ""}
    /><label
      >Nom du projet, code ou ID de demande<input
        class="fr-input"
        name="q"
        value={page.url.searchParams.get("q") ?? ""}
      /></label
    ><button class="fr-btn">Rechercher</button>
  </form>
  <p>
    {data.dossierCount.toLocaleString("fr-FR")} demandes. Les identifiants ci-dessous appartiennent à
    Onagre.
  </p>
  <div class="onagre-table-scroll">
    <table>
      <thead
        ><tr><th>Demande</th><th>Projet</th><th>Nom du projet</th><th>Code Onagre</th></tr></thead
      ><tbody
        >{#each data.dossiers as dossier}<tr class="demande-row">
            {#each [`#${dossier.source_id}`, `#${dossier.projet_id}`, dossier.name, dossier.code] as value, index}
              <td
                ><a
                  href={link({ demande: String(dossier.source_id) })}
                  onclick={open}
                  tabindex={index === 0 ? 0 : -1}
                  aria-label={index === 0 ? `Ouvrir la demande ${dossier.source_id}` : undefined}
                  data-demande-trigger={index === 0 ? dossier.source_id : undefined}
                  >{value || "Non renseigné"}</a
                ></td
              >
            {/each}
          </tr>{/each}</tbody
      >
    </table>
  </div>
  <nav class="onagre-controls" aria-label="Pagination des demandes">
    {#if currentPage > 1}<a href={link({ page: String(currentPage - 1), demande: "" })}
        >Page précédente</a
      >{/if}<span>Page {currentPage}</span>{#if currentPage * 25 < data.dossierCount}<a
        href={link({ page: String(currentPage + 1), demande: "" })}>Page suivante</a
      >{/if}
  </nav>
</section>
{#if data.dossier}
  {#key data.dossier.source_id}
    <DemandeDetail
      dossier={data.dossier}
      onClose={() => void goto(link({ demande: "" }), { reset: false, replace: true })}
    />
  {/key}
{/if}

<style>
  .demande-row td {
    position: relative;
    padding: 0;
  }
  .demande-row a {
    display: block;
    padding: 0.65rem;
    background-image: none;
    color: inherit;
  }
  .demande-row a::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  .demande-row:hover,
  .demande-row:focus-within {
    background: var(--background-action-low-blue-france);
  }
  .demande-row td:first-child a {
    color: var(--text-action-high-blue-france);
    font-weight: 600;
  }
</style>
