<script lang="ts">
  import type { PageData } from "./$types";
  let { data }: { data: PageData } = $props();
  let rehearsal = $derived(data.deploymentRole === "rehearsal");
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
  <div class="admin-panel">
    {#if rehearsal}
      <strong>Tout le dump</strong><span>analyse et import expérimental par lots</span>
    {:else}
      <strong>Préparation</strong><span>dump et décisions, sans création de dossier</span>
    {/if}
  </div>
</div>
<section class="admin-panel">
  <h2>{rehearsal ? "Répéter un import sur un échantillon" : "Préparer la réunion"}</h2>
  {#if rehearsal}
    <p>
      Le profil expérimental reprend le nom du projet, le code de demande et la date de réception
      historique. L'aperçu détaille les données non reprises et les blocages avant la création des
      dossiers.
    </p>
    <p>
      <a href={`?tab=import${data.selected ? `&snapshot=${data.selected.id}` : ""}`}
        >Tester l'import et consulter les rapports enregistrés</a
      >
    </p>
    <p>
      Les règles de reprise ci-dessous restent à confirmer. Ce premier profil ne les valide pas.
    </p>
  {:else}
    <p>
      Les propositions du classeur ont été conservées telles quelles. Même les lignes cochées
      restent à valider dans cet espace.
    </p>
  {/if}
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
    {rehearsal
      ? "Les imports lancés depuis l'onglet Tester l'import créent des dossiers dans cette base de répétition. Les rapports conservent les résultats et les liens vers les dossiers."
      : "Cet espace prépare la migration. La validation d'une correspondance enregistre une décision métier. Elle ne lance pas d'import dans les dossiers Pitchou."}
  </p>
</section>
