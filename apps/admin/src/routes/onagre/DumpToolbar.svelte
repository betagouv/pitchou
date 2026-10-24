<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Select from "@pitchou/ui/Select.svelte";
  import type { PageData } from "./$types";
  import SnapshotUpload from "./SnapshotUpload.svelte";
  import { dumpLink } from "./navigation.ts";
  let { data, writable }: { data: PageData; writable: boolean } = $props();
  let showInfo = $state(false);
</script>

<section class="admin-panel dump-toolbar" aria-label="Dump consulté">
  <div class="dump-toolbar-controls">
    {#if data.selected}
      <div class="onagre-field dump-selector">
        <label for="dump-snapshot">Dump consulté</label>
        <Select
          id="dump-snapshot"
          value={data.selected.id}
          options={data.snapshots.map((snapshot) => ({
            value: snapshot.id,
            label: snapshot.filename,
            hint: `Chargé le ${new Date(snapshot.created_at).toLocaleDateString("fr-FR")}`,
          }))}
          onChange={(snapshot) => goto(dumpLink(page.url, { snapshot, row: null, rowsPage: null }))}
        />
      </div>
      <button
        type="button"
        class="fr-btn fr-btn--secondary"
        aria-expanded={showInfo}
        onclick={() => (showInfo = !showInfo)}>Informations du dump</button
      >
    {/if}
    <SnapshotUpload {writable} />
  </div>
  {#if showInfo && data.selected}
    <div class="dump-info">
      <p>
        Chargé le {new Date(data.selected.created_at).toLocaleString("fr-FR")}. {data.selected
          .records_complete
          ? "Toutes les lignes sont disponibles."
          : "Contenu limité aux anciens échantillons."}
      </p>
      <p class="onagre-fingerprint">Empreinte du fichier · {data.selected.fingerprint}</p>
      {#if data.comparison}
        <p>
          Par rapport au dump précédent : {data.comparison.added} demandes nouvelles, {data
            .comparison.changed} modifiées, {data.comparison.unchanged} identiques et {data
            .comparison.removed} absentes. Cette comparaison porte sur les demandes et leurs projets liés.
        </p>
      {/if}
      <p>
        Recharger le même dump ne crée pas de doublon. Les décisions sont conservées à chaque
        nouveau dump.
      </p>
    </div>
  {/if}
</section>
