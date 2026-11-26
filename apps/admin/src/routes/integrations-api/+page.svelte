<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { pageHeader } from "#lib/pageHeader.svelte.ts";
  import AddApiIntegrationDialog from "./AddApiIntegrationDialog.svelte";
  import ApiIntegrationPanel from "./ApiIntegrationPanel.svelte";
  import type { PageProps } from "./$types";

  let { data }: PageProps = $props();
  let adding = $state(false);
  let activeIntegration = $state<string>();
  let failure = $state("");

  $effect(() => {
    pageHeader.setAction({ label: "Ajouter un service", onClick: () => (adding = true) });
    return () => pageHeader.clearAction();
  });

  async function onCreated(id: string) {
    adding = false;
    activeIntegration = id;
    failure = "";
    try {
      await invalidateAll();
    } catch {
      failure = "Le service a été créé. Rechargez la page pour actualiser la liste.";
    }
  }
</script>

<svelte:head><title>Intégrations API - Administration - Pitchou</title></svelte:head>

<div class="admin-stack">
  {#if failure}
    <div class="fr-alert fr-alert--error fr-alert--sm" role="alert"><p>{failure}</p></div>
  {/if}

  {#each data.integrations as integration (integration.id)}
    <ApiIntegrationPanel
      {integration}
      groupes={data.groupes}
      open={activeIntegration === integration.id}
    />
  {:else}
    <div class="admin-panel">
      <p class="m-0! text-sm text-[var(--text-mention-grey)]">
        Aucun service partenaire configuré.
      </p>
    </div>
  {/each}
</div>

{#if adding}
  <AddApiIntegrationDialog onClose={() => (adding = false)} {onCreated} />
{/if}
