<script lang="ts">
  import CollapsibleNotice from "$lib/components/CollapsibleNotice.svelte";
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
<div class="flex flex-col gap-2">
  <CollapsibleNotice title="Outils réservés à l'équipe technique">
    <p class="!m-0 text-sm">
      La synchronisation met à jour les dossiers depuis Démarches Numériques ; les autres actions
      n'ont aucun effet sur les données.
    </p>
  </CollapsibleNotice>

  <SyncDemarcheNumeriqueSection />

  <section
    class="rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 shadow-sm"
  >
    <h2 class="my-0 text-base font-semibold">Sentry</h2>
    <p class="fr-mb-2w mt-1 text-sm text-[color:var(--text-mention-grey)]">
      Déclenche une erreur dans le navigateur pour vérifier son signalement dans Sentry.
    </p>
    <button class="fr-btn fr-btn--secondary" type="button" onclick={triggerSentryTestError}>
      Tester Sentry
    </button>
  </section>
</div>
