<script lang="ts">
  function triggerSentryTestError() {
    if (!window.confirm("Déclencher une erreur de test dans Sentry ?")) return;

    throw new Error("Sentry test error triggered from the administration tech page");
  }
</script>

<svelte:head>
  <title>Administration - tech — Pitchou</title>
</svelte:head>

<p class="max-w-xl text-gray-600">
  Outils réservés à l'équipe technique. Les actions ici n'ont aucun effet sur les données des
  dossiers.
</p>

<section class="max-w-xl rounded-lg border border-solid border-gray-200 bg-white p-4 shadow-sm">
  <h2 class="my-0 text-base font-semibold">Sentry</h2>
  <p class="fr-mb-2w mt-1 text-sm text-gray-500">
    Déclenche une erreur dans le navigateur pour vérifier son signalement dans Sentry.
  </p>
  <button class="fr-btn fr-btn--secondary" type="button" onclick={triggerSentryTestError}>
    Tester Sentry
  </button>
</section>
