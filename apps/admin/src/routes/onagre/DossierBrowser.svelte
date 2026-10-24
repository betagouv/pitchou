<script lang="ts">
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
  let currentPage = $derived(Math.max(1, Number(page.url.searchParams.get("page")) || 1));
  function link(values: Record<string, string>) {
    const params = new URLSearchParams(page.url.searchParams.toString());
    for (const [key, value] of Object.entries(values)) params.set(key, value);
    return `?${params}`;
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
        >{#each data.dossiers as dossier}<tr
            ><td><a href={link({ demande: String(dossier.source_id) })}>#{dossier.source_id}</a></td
            ><td>#{dossier.projet_id}</td><td>{dossier.name}</td><td>{dossier.code}</td></tr
          >{/each}</tbody
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
{#if data.dossier}<section class="admin-panel">
    <h2>Demande Onagre #{data.dossier.source_id}</h2>
    <p>
      Valeurs source, avant toute transformation. Les avis, décisions et pièces jointes se
      consultent pour l'instant dans les exemples de tables.
    </p>
    {#each [data.dossier.demande, data.dossier.projet] as row, index}<h3>
        {index === 0 ? "Demande" : "Projet lié"}
      </h3>
      <div class="onagre-table-scroll">
        <table>
          <tbody
            >{#each Object.entries(row) as [key, value]}<tr
                ><th scope="row">{key}</th><td>{value ?? "Non renseigné"}</td></tr
              >{/each}</tbody
          >
        </table>
      </div>{/each}
  </section>{/if}
