<script lang="ts">
  import { page } from "$app/state";
  import { can } from "#lib/access.svelte.ts";
  import type { PageData, ActionData } from "./$types";
  import MappingWorkspace from "./MappingWorkspace.svelte";
  import SnapshotOverview from "./SnapshotOverview.svelte";
  import SourceBrowser from "./SourceBrowser.svelte";
  import DossierBrowser from "./DossierBrowser.svelte";
  import "./workspace.css";
  let { data, form }: { data: PageData; form: ActionData } = $props();
  const tabs = ["synthese", "correspondances", "dossiers", "source", "historique"];
  const labels = [
    "Vue d'ensemble",
    "Correspondances",
    "Demandes Onagre",
    "Tables source",
    "Historique",
  ];
  let tab = $derived(page.url.searchParams.get("tab") ?? "synthese");
  let writable = $derived(can("admin:onagre:manage"));
</script>

<svelte:head><title>Migration Onagre · Pitchou</title></svelte:head>
<div class="onagre admin-stack">
  <div class="admin-panel onagre-intro">
    <div>
      <h2>Préparer la reprise des dossiers</h2>
      <p>Les choix de l'équipe et les données Onagre, au même endroit.</p>
    </div>
    <a class="fr-btn fr-btn--secondary fr-btn--sm" href="/onagre/export">Exporter les décisions</a>
  </div>
  {#if form?.message}<p role="status" class="fr-alert fr-alert--info">{form.message}</p>{/if}
  <nav class="onagre-tabs" aria-label="Migration Onagre">
    {#each tabs as value, i}
      <a
        href={`?tab=${value}${data.selected ? `&snapshot=${data.selected.id}` : ""}`}
        aria-current={tab === value ? "page" : undefined}>{labels[i]}</a
      >
    {/each}
  </nav>
  {#if tab === "correspondances"}
    <MappingWorkspace mappings={data.mappings} targets={data.targets} {writable} />
  {:else if tab === "dossiers"}
    <DossierBrowser {data} />
  {:else if tab === "source"}
    <SourceBrowser tables={data.selected?.tables ?? []} mappings={data.mappings} />
  {:else if tab === "historique"}
    <section class="admin-panel">
      <h2>Dernières décisions enregistrées</h2>
      {#each data.history as revision}
        <article class="onagre-history">
          <strong>{revision.mapping_key}</strong>
          <p>
            {new Date(revision.created_at).toLocaleString("fr-FR")} · Compte #{revision.actor_id} · Version
            {revision.after.version}
          </p>
          <p>{revision.after.target || "Sans destination"} · {revision.after.rule}</p>
        </article>
      {:else}<p>
          Aucune décision enregistrée. Les propositions du classeur restent à relire.
        </p>{/each}
      <p>
        L'export contient l'historique complet. Cette page affiche les 30 dernières modifications.
      </p>
    </section>
  {:else}
    <SnapshotOverview {data} {writable} />
  {/if}
</div>
