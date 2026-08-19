<script lang="ts">
  import SyncDemarcheNumeriqueSection from "./SyncDemarcheNumeriqueSection.svelte";

  function triggerSentryTestError() {
    if (!window.confirm("Déclencher une erreur de test dans Sentry ?")) return;

    throw new Error("Sentry test error triggered from the administration tech page");
  }
</script>

<svelte:head>
  <title>Administration - tech — Pitchou</title>
</svelte:head>

<p class="text-gray-600">
  Outils réservés à l'équipe technique. La synchronisation met à jour les dossiers depuis Démarches
  Simplifiées ; les autres actions n'ont aucun effet sur les données.
</p>

<SyncDemarcheNumeriqueSection />

<section class="fr-mt-3w rounded-lg border border-solid border-gray-200 bg-white p-4 shadow-sm">
  <h2 class="my-0 text-base font-semibold">Sentry</h2>
  <p class="fr-mb-2w mt-1 text-sm text-gray-500">
    Déclenche une erreur dans le navigateur pour vérifier son signalement dans Sentry.
  </p>
  <button class="fr-btn fr-btn--secondary" type="button" onclick={triggerSentryTestError}>
    Tester Sentry
  </button>
</section>
