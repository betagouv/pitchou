<script lang="ts">
  import { enhance } from "$app/forms";
  import { goto } from "$app/navigation";
  import WorkspaceDialog from "./WorkspaceDialog.svelte";
  let { writable }: { writable: boolean } = $props();
  let expanded = $state(false);
  let busy = $state(false);
  let files = $state<FileList>();
  let message = $state("");
</script>

{#if writable}
  <button class="fr-btn" type="button" onclick={() => (expanded = true)}
    >Charger un autre dump</button
  >
{/if}
{#if expanded}
  <WorkspaceDialog
    title="Charger un autre dump"
    {busy}
    onClose={() => {
      if (!busy) expanded = false;
    }}
  >
    <form
      method="POST"
      action="?/upload&tab=dump"
      enctype="multipart/form-data"
      class="admin-stack dump-upload-form"
      use:enhance={() => {
        busy = true;
        message = "";
        return async ({ update, result }) => {
          try {
            if (result.type === "success" && result.data?.snapshotId) {
              expanded = false;
              await update();
              await goto(`?tab=dump&snapshot=${result.data.snapshotId}`, { invalidateAll: true });
            } else {
              message =
                result.type === "failure" && typeof result.data?.message === "string"
                  ? result.data.message
                  : "Chargement impossible. Réessayez.";
            }
          } finally {
            busy = false;
          }
        };
      }}
    >
      <p>
        Sélectionnez le paquet complet préparé à partir du dump Onagre. Il contient toutes les
        tables et leurs lignes. Les décisions de correspondance sont conservées.
      </p>
      <label class="onagre-upload" class:disabled={busy}>
        <input
          class="sr-only"
          type="file"
          name="bundle"
          accept=".gz,.json,application/gzip,application/json"
          required
          disabled={busy}
          bind:files
          aria-label="Paquet Onagre, 64 Mo maximum"
        />
        <span class="fr-icon-upload-line" aria-hidden="true"></span>
        <span
          ><strong>{files?.[0]?.name ?? "Choisir un paquet Onagre"}</strong>
          <span class="onagre-context">JSONL.gz · 64 Mo maximum</span></span
        >
        <span class="onagre-file-action">{files?.length ? "Changer" : "Parcourir"}</span>
      </label>
      {#if message}<p role="alert">{message}</p>{/if}
      {#if busy}<p role="status">
          Chargement des tables en cours. Cette opération peut prendre quelques minutes.
        </p>{/if}
      <button class="fr-btn" disabled={busy}
        >{busy ? "Chargement en cours…" : "Charger le dump"}</button
      >
    </form>
  </WorkspaceDialog>
{/if}
