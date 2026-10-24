<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import SnapshotUpload from "./SnapshotUpload.svelte";
  import type { PageData } from "./$types";
  let { data, writable }: { data: PageData; writable: boolean } = $props();
  let snapshotId = $state(0);
  $effect(() => {
    snapshotId = data.selected?.id ?? 0;
  });
  let complete = $derived(
    data.mappings.filter((m) => ["validated", "excluded"].includes(m.status)).length,
  );
  const count = (name: string) => data.selected?.tables.find((t) => t.name === name)?.count ?? 0;
</script>

<div class="onagre-stats">
  <div class="admin-panel">
    <strong>{count("demandes").toLocaleString("fr-FR")}</strong><span>demandes Onagre</span>
  </div>
  <div class="admin-panel">
    <strong>{count("projet").toLocaleString("fr-FR")}</strong><span>projets Onagre</span>
  </div>
  <div class="admin-panel">
    <strong>{complete} / {data.mappings.length}</strong><span>correspondances traitées</span>
  </div>
  <div class="admin-panel"><strong>0</strong><span>dossier Pitchou créé par cet espace</span></div>
</div>
<section class="admin-panel">
  <h2>Préparer la réunion</h2>
  <p>
    Les propositions du classeur ont été conservées telles quelles. Même les lignes cochées restent
    à valider dans cet espace.
  </p>
  <ul>
    <li>Confirmer l'unité de reprise. Un projet Onagre peut contenir plusieurs demandes.</li>
    <li>
      Préciser les activités qui ont plusieurs destinations possibles, notamment les énergies
      renouvelables.
    </li>
    <li>
      Définir les statuts, les dates manquantes, les contacts et l'affectation aux groupes
      instructeurs.
    </li>
    <li>
      Obtenir les fichiers des pièces jointes. Le dump contient leurs descriptions et leurs chemins.
    </li>
  </ul>
  {#if data.diagnostics}<p>
      {data.diagnostics.missing_dates} demandes sans date de réception · {data.diagnostics
        .duplicate_codes} codes réutilisés. Le suivi des dumps repose sur l'identifiant interne de la
      demande.
    </p>{/if}
  <p class="onagre-notice">
    Cet espace prépare la migration. La validation d'une correspondance enregistre une décision
    métier. Elle ne lance pas d'import dans les dossiers Pitchou.
  </p>
</section>
<section class="admin-panel">
  <h2>Dumps et mises à jour</h2>
  {#if data.selected}
    <form method="GET" class="onagre-controls">
      <input type="hidden" name="tab" value="synthese" />
      <input type="hidden" name="snapshot" value={snapshotId} />
      <div class="onagre-field">
        <label for="snapshot">Dump consulté</label>
        <Select
          id="snapshot"
          bind:value={snapshotId}
          options={data.snapshots.map((snapshot) => ({
            value: snapshot.id,
            label: `#${snapshot.id} · ${snapshot.filename} · chargé le ${new Date(snapshot.created_at).toLocaleDateString("fr-FR")}`,
          }))}
        />
      </div>
      <button class="fr-btn fr-btn--secondary">Afficher</button>
    </form>
    <p class="onagre-fingerprint">Empreinte du fichier · {data.selected.fingerprint}</p>
    {#if data.comparison}
      <p>Par rapport au dump précédent, sur les champs des demandes et projets :</p>
      <ul>
        <li>{data.comparison.added} demandes nouvelles</li>
        <li>{data.comparison.changed} demandes modifiées</li>
        <li>{data.comparison.unchanged} demandes identiques</li>
        <li>{data.comparison.removed} demandes absentes du nouveau dump</li>
      </ul>
    {:else}<p>
        Premier dump chargé. Un prochain dump permettra de comparer les demandes et leurs projets.
      </p>{/if}
  {:else}<p>Chargez le paquet préparé à partir du dump et du classeur pour commencer.</p>{/if}
  <p>
    Recharger le même dump ne crée pas de doublon. Les décisions restent en place à chaque nouveau
    dump. Une demande absente n'entraîne aucune suppression.
  </p>
  <SnapshotUpload {writable} />
</section>
