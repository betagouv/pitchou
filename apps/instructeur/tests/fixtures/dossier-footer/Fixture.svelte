<script>
  import "../../../src/app.css";
  import Dossier from "../../../src/routes/dossier/[dossierId]/Dossier.svelte";
  import Footer from "../../../src/routes/Layout/Footer.svelte";

  const mode = new URLSearchParams(location.search).get("mode") ?? "dossier";
  let activeTab = $state("instruction");
</script>

<header class="fr-container"><h1>Footer layout fixture</h1></header>
<main id="main">
  <div class={mode === "public" ? "fr-container" : "pitchou-container"}>
    {#if mode === "dossier"}
      <Dossier
        dossier={{ id: 1, name: "Test dossier" }}
        {activeTab}
        onTabChange={(tab) => (activeTab = tab)}
        email="test@example.com"
        dossierFollowers={[]}
        currentDossierFollowedByCurrentInstructeur={false}
        readOnly={false}
        onReadOnlyChange={() => {}}
        canEdit={true}
        onClose={() => {}}
      />
    {:else}
      <p style="min-height: 900px">{mode} page</p>
    {/if}
  </div>
</main>
<Footer compact={mode !== "public"} />

<style>
  :global(#tabpanel-instruction-panel .fixture-content) {
    min-height: 900px;
  }

  :global(#tabpanel-detail-du-projet-panel .fixture-content) {
    min-height: 1200px;
  }
</style>
