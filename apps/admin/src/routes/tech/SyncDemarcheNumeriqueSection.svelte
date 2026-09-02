<script lang="ts">
  import { onMount } from "svelte";
  import DatePicker from "@pitchou/ui/DatePicker.svelte";

  import {
    INCEPTION_DATE,
    hoursAgo,
    shortcuts,
    toISODate,
    toTimeValue,
  } from "./SyncDemarcheNumeriqueSection/dates.ts";
  import SyncLogPanel from "./SyncDemarcheNumeriqueSection/SyncLogPanel.svelte";
  import SyncStatusSummary from "./SyncDemarcheNumeriqueSection/SyncStatusSummary.svelte";

  type SyncStatus = {
    running: boolean;
    lastRun: {
      startedAt: string;
      lastModified: string;
      finishedAt: string | null;
      exitCode: number | null;
    } | null;
    logChunk: string;
    logOffset: number;
    logTruncated: boolean;
    results: Array<{ success: boolean; timestamp: string; error: string | null }>;
  };

  const POLL_INTERVAL = 2000;

  const defaultDate = hoursAgo(12);
  let dateValue = $state(toISODate(defaultDate));
  let timeValue = $state(toTimeValue(defaultDate));
  let syncStatus = $state<SyncStatus | null>(null);
  let triggerError = $state<string | null>(null);
  let triggering = $state(false);
  let pollTimeout: ReturnType<typeof setTimeout> | undefined;

  let log = $state("");
  let logTruncated = $state(false);
  let logOffset = 0;
  let logRunStartedAt: string | null = null;

  async function refreshSyncStatus() {
    clearTimeout(pollTimeout);
    try {
      const requestedOffset = logOffset;
      const response = await fetch(`/api/synchronisation-dn?logOffset=${requestedOffset}`);
      if (!response.ok) return;
      const status: SyncStatus = await response.json();

      // A new run resets the server-side log buffer: restart from offset 0 so
      // the beginning of the log is not skipped.
      if (status.lastRun?.startedAt !== logRunStartedAt) {
        logRunStartedAt = status.lastRun?.startedAt ?? null;
        log = "";
        logTruncated = false;
        logOffset = 0;
        if (requestedOffset > 0) return refreshSyncStatus();
      }

      log += status.logChunk;
      logTruncated = logTruncated || status.logTruncated;
      logOffset = status.logOffset;
      syncStatus = status;
    } finally {
      if (syncStatus?.running) pollTimeout = setTimeout(refreshSyncStatus, POLL_INTERVAL);
    }
  }

  async function triggerSync() {
    triggerError = null;
    const lastModified = dateValue ? new Date(`${dateValue}T${timeValue || "00:00"}`) : null;
    if (!lastModified || Number.isNaN(lastModified.getTime())) {
      triggerError = "Date invalide.";
      return;
    }

    triggering = true;
    try {
      const response = await fetch("/api/synchronisation-dn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastModified: lastModified.toISOString() }),
      });
      if (!response.ok) {
        triggerError = (await response.json().catch(() => null))?.message ?? response.statusText;
        return;
      }
      await refreshSyncStatus();
    } catch (fetchError) {
      triggerError = String(fetchError);
    } finally {
      triggering = false;
    }
  }

  onMount(() => {
    refreshSyncStatus();
    return () => clearTimeout(pollTimeout);
  });
</script>

<section
  class="rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] p-4 shadow-sm"
>
  <h2 class="my-0 text-base font-semibold">Synchronisation Démarches Numériques</h2>
  <p class="fr-mb-2w mt-1 text-sm text-[color:var(--text-mention-grey)]">
    Lance la même synchronisation que le cron (toutes les 10 minutes) : les dossiers modifiés sur
    Démarches Numériques depuis la date choisie sont resynchronisés. Une date lointaine (par exemple
    depuis le lancement) peut prendre beaucoup de temps.
  </p>

  <div class="fr-mb-2w">
    <label class="fr-label" for="sync-date">Dossiers modifiés depuis le</label>
    <div class="mt-2 flex flex-wrap items-center gap-3">
      <div class="flex w-56">
        <DatePicker
          id="sync-date"
          label="Dossiers modifiés depuis le"
          value={dateValue}
          min={toISODate(INCEPTION_DATE)}
          max={toISODate(new Date())}
          onChange={(value) => (dateValue = value ?? "")}
        />
      </div>
      <span>à</span>
      <input
        class="fr-input my-0 w-32"
        type="time"
        id="sync-time"
        aria-label="Heure"
        bind:value={timeValue}
      />
    </div>
  </div>

  <div class="fr-mb-2w flex flex-wrap gap-2">
    {#each shortcuts as shortcut (shortcut.label)}
      <button
        class="fr-btn fr-btn--tertiary fr-btn--sm"
        type="button"
        onclick={() => {
          const date = shortcut.date();
          dateValue = toISODate(date);
          timeValue = toTimeValue(date);
        }}
      >
        {shortcut.label}
      </button>
    {/each}
  </div>

  <button
    class="fr-btn"
    type="button"
    disabled={triggering || syncStatus?.running}
    onclick={triggerSync}
  >
    {syncStatus?.running ? "Synchronisation en cours…" : "Lancer la synchronisation"}
  </button>

  {#if triggerError}
    <p class="fr-mt-2w my-0 text-sm text-[color:var(--text-default-error)]">{triggerError}</p>
  {/if}

  {#if syncStatus}
    <SyncStatusSummary
      running={syncStatus.running}
      lastRun={syncStatus.lastRun}
      results={syncStatus.results}
    />
  {/if}

  {#if log || syncStatus?.running}
    <SyncLogPanel {log} truncated={logTruncated} />
  {/if}
</section>
