<script lang="ts">
  import { goto } from "$app/navigation";
  import Select from "@pitchou/ui/Select.svelte";
  import type { PageData } from "../$types";

  let {
    data,
    input = $bindable(""),
    busy,
    onPreview,
  }: {
    data: Pick<PageData, "selected" | "snapshots">;
    input: string;
    busy: boolean;
    onPreview: () => void;
  } = $props();
</script>

<section class="admin-panel">
  <h2>Choisir les demandes à tester</h2>
  {#if data.selected}
    <form
      onsubmit={(event) => {
        event.preventDefault();
        onPreview();
      }}
    >
      <div class="onagre-field">
        <label for="import-snapshot">Dump source</label>
        <Select
          id="import-snapshot"
          value={data.selected.id}
          disabled={busy}
          options={data.snapshots.map((snapshot) => ({
            value: snapshot.id,
            label: snapshot.filename,
            hint: `Chargé le ${new Date(snapshot.created_at).toLocaleString("fr-FR")}`,
          }))}
          onChange={(snapshot) => void goto(`?tab=import&snapshot=${snapshot}`)}
        />
      </div>
      <p class="onagre-fingerprint">Empreinte du dump · {data.selected.fingerprint}</p>
      {#if !data.selected.records_complete}
        <p class="onagre-notice">
          Ce dump ne contient que des échantillons. Chargez un dump complet avant de tester
          l'import.
        </p>
      {/if}
      <div class="onagre-field">
        <label for="import-record-ids">Identifiants internes des demandes Onagre</label>
        <textarea
          id="import-record-ids"
          class="fr-input"
          bind:value={input}
          disabled={busy || !data.selected.records_complete}
          aria-describedby="import-record-help"
          required
          spellcheck="false"
          placeholder="12345, 12346"></textarea>
        <span id="import-record-help" class="onagre-context">
          10 demandes au maximum. Séparez les identifiants par une virgule, un espace ou un retour à
          la ligne. Utilisez l'ID de demande, pas le code Onagre ni l'ID du projet.
          <a href={`?tab=dossiers&snapshot=${data.selected.id}`}>Consulter les demandes du dump</a>.
        </span>
      </div>
      <div class="onagre-controls">
        <button class="fr-btn" disabled={busy || !data.selected.records_complete}>
          {busy ? "Traitement en cours…" : "Calculer l'aperçu"}
        </button>
        <span class="onagre-context">L'aperçu ne crée aucun dossier.</span>
      </div>
    </form>
  {:else}
    <p>
      Aucun dump chargé. <a href="?tab=dump">Charger un dump Onagre</a> pour préparer un aperçu.
    </p>
  {/if}
</section>
