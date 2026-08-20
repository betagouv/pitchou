<script lang="ts">
  import { dateTimeFormat } from "./dates.ts";

  type Props = {
    running: boolean;
    lastRun: {
      startedAt: string;
      lastModified: string;
      finishedAt: string | null;
      exitCode: number | null;
    } | null;
    results: Array<{ success: boolean; timestamp: string; error: string | null }>;
  };

  let { running, lastRun, results }: Props = $props();

  const lastSuccess = $derived(results.find((result) => result.success));
  const lastFailure = $derived(results.find((result) => !result.success));
  const lastRunFailed = $derived(
    lastRun != null && lastRun.finishedAt !== null && lastRun.exitCode !== 0,
  );
</script>

<div class="fr-mt-2w text-sm text-[color:var(--text-default-grey)]">
  {#if running && lastRun}
    <p class="my-0">
      Synchronisation lancée le {dateTimeFormat.format(new Date(lastRun.startedAt))}
      (dossiers modifiés depuis le {dateTimeFormat.format(new Date(lastRun.lastModified))})…
    </p>
  {/if}
  {#if lastRunFailed && lastRun}
    <p class="my-0 text-[color:var(--text-default-error)]">
      Le dernier lancement depuis cette page a échoué (code {lastRun.exitCode}).
    </p>
  {/if}
  {#if lastSuccess}
    <p class="my-0">
      Dernière synchronisation réussie : {dateTimeFormat.format(new Date(lastSuccess.timestamp))}
    </p>
  {/if}
  {#if lastFailure}
    <p class="my-0">
      Dernière synchronisation échouée : {dateTimeFormat.format(new Date(lastFailure.timestamp))}
      {#if lastFailure.error}
        — {lastFailure.error}
      {/if}
    </p>
  {/if}
</div>
