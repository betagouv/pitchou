<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
  import SyncDemarcheNumeriqueSection from "./SyncDemarcheNumeriqueSection.svelte";

  function triggerSentryTestError() {
    if (!window.confirm("Déclencher une erreur de test dans Sentry ?")) return;

    throw new Error("Sentry test error triggered from the administration tech page");
  }
</script>

<svelte:head>
  <title>Administration - tech — Pitchou</title>
</svelte:head>

<!-- Single column with the same gap as the view padding (p-2 on <main>), like the activities page. -->
<div class="admin-stack">
  <PageHelp title="Outils techniques">
    <h3>Synchronisation Démarches Numériques</h3>
    <p class="!m-0 text-sm">
      La synchronisation met à jour les dossiers depuis Démarches Numériques ; les autres actions
      n'ont aucun effet sur les données.
    </p>
    <p>
      La synchronisation automatique s’exécute toutes les dix minutes. Le lancement manuel reprend
      les dossiers modifiés depuis la date choisie. Plus cette date est ancienne, plus le traitement
      peut être long.
    </p>
    <h3>Test Sentry</h3>
    <p>
      Le bouton de test déclenche une erreur dans le navigateur pour vérifier sa remontée dans
      Sentry.
    </p>
  </PageHelp>

  <SyncDemarcheNumeriqueSection />

  <section class="admin-panel">
    <h2 class="my-0 text-base font-semibold">Sentry</h2>
    <p class="fr-mb-2w mt-1 text-sm text-[color:var(--text-mention-grey)]">
      Déclenche une erreur dans le navigateur pour vérifier son signalement dans Sentry.
    </p>
    <button class="fr-btn fr-btn--secondary" type="button" onclick={triggerSentryTestError}>
      Tester Sentry
    </button>
  </section>
</div>
