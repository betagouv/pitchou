<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
  let rehearsal = $derived(data.deploymentRole === "rehearsal");
  let complete = $derived(
    data.mappings.filter((m) => ["validated", "excluded"].includes(m.status)).length,
  );
  const count = (name: string) => data.selected?.tables.find((t) => t.name === name)?.count ?? 0;
</script>

<div class="onagre-stats">
  <div class="admin-panel">
    <strong>{count("demandes").toLocaleString("fr-FR")}</strong><span>demandes Onagre</span>
  </div>
  <div class="admin-panel">
    <strong>{count("projet").toLocaleString("fr-FR")}</strong><span>projets Onagre</span>
  </div>
  <div class="admin-panel">
    <strong>{complete} / {data.mappings.length}</strong><span>correspondances traitées</span>
  </div>
  <div class="admin-panel">
    {#if rehearsal}
      <strong>Tout le dump</strong><span>analyse et import expérimental par lots</span>
    {:else}
      <strong>Préparation</strong><span>dump et décisions, sans création de dossier</span>
    {/if}
  </div>
</div>
