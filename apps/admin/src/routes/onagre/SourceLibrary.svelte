<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import SourceDocument from "./SourceDocument.svelte";
  import { normalize } from "./mappings.ts";
  import "./sources.css";
  let { data }: { data: PageData } = $props();
  let search = $state("");
  let documents = $derived(
    data.documents.filter((d) =>
      normalize(`${d.filename} ${d.review.category} ${d.review.summary}`).includes(
        normalize(search),
      ),
    ),
  );
  let selected = $derived(data.documents.find((d) => d.id === data.sourceDocument?.id));
  function select(id: number) {
    const params = new URLSearchParams({ tab: "sources", document: String(id) });
    const snapshot = page.url.searchParams.get("snapshot");
    if (snapshot) params.set("snapshot", snapshot);
    void goto(`?${params}`, { reset: false });
  }
</script>

<div class="source-library">
  <aside class="source-files admin-panel">
    <h2>Fichiers sources <span>{data.documents.length}</span></h2>
    <label class="fr-sr-only" for="source-files-search">Rechercher un fichier</label>
    <input
      id="source-files-search"
      type="search"
      class="fr-input"
      placeholder="Rechercher un fichier…"
      bind:value={search}
    />
    <nav aria-label="Fichiers du dossier Onagre">
      {#each documents as document}
        <button
          type="button"
          aria-current={selected?.id === document.id ? "true" : undefined}
          onclick={() => select(document.id)}
        >
          <span>{document.filename}</span><small>{document.review.category}</small>
        </button>
      {:else}<p>Aucun fichier trouvé.</p>{/each}
    </nav>
  </aside>
  <div class="source-main">
    {#if selected && data.sourceDocument}
      <SourceDocument document={selected} content={data.sourceDocument} />
    {:else}
      <section class="admin-panel source-intro">
        <h2>Le dossier Onagre, fichier par fichier</h2>
        <p>
          Contenu, utilisation dans la migration et choix d'intégration pour les 15 fichiers
          vérifiés sur Polaris.
        </p>
        <p>
          Les documents complètent le dump. Leur consultation ne modifie ni les correspondances ni
          les dossiers Pitchou.
        </p>
        <p>
          Les originaux des classeurs et PDF sont disponibles ici. Le dump et le grand CSV d'espèces
          restent accessibles par l'explorateur, sans deuxième copie de leurs données.
        </p>
        <p class="onagre-context">
          Dossier vérifié le 25 octobre 2026. Les empreintes SHA-256 correspondent aux fichiers de
          Polaris. Chaque document est associé au dump examiné ; un nouveau dump ne le rend pas
          automatiquement à jour.
        </p>
        {#if !data.documents.length}<p>Aucun document chargé dans cet environnement.</p>{/if}
      </section>
    {/if}
  </div>
</div>
