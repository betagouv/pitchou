<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
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
