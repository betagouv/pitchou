<script lang="ts">
  import { enhance } from "$app/forms";
  let { writable }: { writable: boolean } = $props();
  let expanded = $state(false);
  let busy = $state(false);
  let files = $state<FileList>();
</script>

<button
  class="onagre-disclosure"
  type="button"
  aria-expanded={expanded}
  aria-controls="snapshot-upload"
  onclick={() => (expanded = !expanded)}
>
  <span
    class={expanded ? "fr-icon-arrow-down-s-line" : "fr-icon-arrow-right-s-line"}
    aria-hidden="true"
  ></span>
  Charger un dump préparé
</button>
{#if expanded}
  <div id="snapshot-upload">
    <p>
      Le script <code>scripts/onagre/prepare.ts</code> transforme le backup PostgreSQL et le classeur
      en paquet JSON. Le chargement conserve les demandes et projets complets, ainsi que trois exemples
      par table. Les autres lignes restent dans le dump original.
    </p>
    {#if writable}
      <form
        method="POST"
        action="?/upload"
        enctype="multipart/form-data"
        class="admin-stack"
        use:enhance={() => {
          busy = true;
          return async ({ update }) => {
            try {
              await update();
            } finally {
              busy = false;
            }
          };
        }}
      >
        <label class="onagre-upload" class:disabled={busy}>
          <input
            class="sr-only"
            type="file"
            name="bundle"
            accept=".json,application/json"
            required
            disabled={busy}
            bind:files
            aria-label="Paquet Onagre JSON, 64 Mo maximum"
          />
          <span class="fr-icon-upload-line" aria-hidden="true"></span>
          <span
            ><strong>{files?.[0]?.name ?? "Choisir un paquet Onagre"}</strong>
            <span class="onagre-context">JSON · 64 Mo maximum</span></span
          >
          <span class="onagre-file-action">{files?.length ? "Changer" : "Parcourir"}</span>
        </label>
        <button class="fr-btn" disabled={busy}>
          {busy ? "Chargement en cours…" : "Charger dans l'espace de préparation"}
        </button>
      </form>
    {:else}
      <p>La permission de préparer la migration Onagre est nécessaire pour charger un dump.</p>
    {/if}
  </div>
{/if}
