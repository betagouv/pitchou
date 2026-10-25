<script lang="ts">
  import { page } from "$app/state";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import { can } from "#lib/access.svelte.ts";
  import type { PageData, ActionData } from "./$types";
  import MappingWorkspace from "./MappingWorkspace.svelte";
  import SnapshotOverview from "./SnapshotOverview.svelte";
  import DumpExplorer from "./DumpExplorer.svelte";
  import DossierBrowser from "./DossierBrowser.svelte";
  import ActivityWorkspace from "./ActivityWorkspace.svelte";
  import ServiceWorkspace from "./ServiceWorkspace.svelte";
  import SharedRules from "./SharedRules.svelte";
  import ImportWorkspace from "./ImportWorkspace.svelte";
  import "./workspace.css";
  let { data, form }: { data: PageData; form: ActionData } = $props();
  let tabs = $derived([
    "synthese",
    "correspondances",
    "services",
    "activites",
    "regles",
    "dossiers",
    "dump",
    "historique",
    ...(data.deploymentRole === "rehearsal" ? ["import"] : []),
  ]);
  const labels = [
    "Vue d'ensemble",
    "Correspondances",
    "Services et groupes",
    "Objets et activités",
    "Règles communes",
    "Demandes Onagre",
    "Explorer le dump",
    "Historique",
    "Tester l'import",
  ];
  let tab = $derived(page.url.searchParams.get("tab") ?? "synthese");
  let writable = $derived(can("admin:onagre:manage"));
  $effect(() => {
    pageHeader.setAction({
      label: "Exporter les décisions",
      presentation: "text",
      onClick: () => {
        window.location.href = "/onagre/export";
      },
    });
    return () => pageHeader.clearAction();
  });
</script>

<svelte:head><title>Migration Onagre · Pitchou</title></svelte:head>
<div class="onagre admin-stack">
  <div class="onagre-environment" class:rehearsal={data.deploymentRole === "rehearsal"}>
    <strong
      >{data.deploymentRole === "rehearsal"
        ? "Répétition d'import"
        : "Préparation partagée"}</strong
    >
    <span
      >{data.deploymentRole === "rehearsal"
        ? "Environnement de test. Les imports créent des dossiers dans cette base."
        : "Cet espace conserve le dump et les décisions de reprise."}</span
    >
  </div>
  {#if form?.message && tab !== "correspondances"}<p role="status" class="fr-alert fr-alert--info">
      {form.message}
    </p>{/if}
  <nav class="onagre-tabs" aria-label="Migration Onagre">
    {#each tabs as value, i}
      <a
        href={`?tab=${value}${data.selected ? `&snapshot=${data.selected.id}` : ""}`}
        aria-current={tab === value ? "page" : undefined}>{labels[i]}</a
      >
    {/each}
  </nav>
  {#if tab === "correspondances"}
    <MappingWorkspace
      activityWorkspace={data.activityWorkspace}
      mappings={data.mappings}
      targets={data.targets}
      tables={data.selected?.tables ?? []}
      {writable}
    />
  {:else if tab === "activites" && data.activityWorkspace}
    <ActivityWorkspace
      workspace={data.activityWorkspace}
      mappings={data.mappings}
      targets={data.targets}
      tables={data.selected?.tables ?? []}
      {writable}
    />
  {:else if tab === "services"}
    {#if data.servicesWorkspace && data.selected}
      <ServiceWorkspace
        workspace={data.servicesWorkspace}
        snapshotId={data.selected.id}
        {writable}
      />
    {:else}
      <p class="admin-panel">
        Chargez un dump complet pour préparer les correspondances des services.
      </p>
    {/if}
  {:else if tab === "regles"}
    <SharedRules rules={data.sharedRules} {writable} />
  {:else if tab === "dossiers"}
    <DossierBrowser {data} />
  {:else if tab === "dump" || tab === "source"}
    <DumpExplorer {data} {writable} />
  {:else if tab === "import" && data.deploymentRole === "rehearsal"}
    {#key data.selected?.id}
      <ImportWorkspace {data} {writable} />
    {/key}
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
          <p>{revision.after.target ? `${revision.after.target} · ` : ""}{revision.after.rule}</p>
        </article>
      {:else}<p>
          Aucune décision enregistrée. Les propositions du classeur restent à relire.
        </p>{/each}
      <p>
        L'export contient l'historique complet. Cette page affiche les 30 dernières modifications.
      </p>
    </section>
  {:else}
    <SnapshotOverview {data} />
  {/if}
</div>

<style>
  .onagre-environment {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.75rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    font-size: 0.875rem;
    background: var(--background-alt-grey);
  }
  .onagre-environment.rehearsal {
    background: var(--background-contrast-warning);
    border-color: var(--border-plain-warning);
  }
</style>
