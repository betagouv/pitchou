<script lang="ts">
  import { page } from "$app/state";
  import type { OnagreMapping, OnagreTable } from "@pitchou/types/onagre.ts";
  let { mapping, table }: { mapping: OnagreMapping; table?: OnagreTable } = $props();
  let field = $derived(
    mapping.key.startsWith("field:") ? mapping.key.slice(`field:${mapping.section}.`.length) : null,
  );
  let samples = $derived(field && table ? table.samples.map((row) => row[field!]) : []);
  let url = $derived(page.shallow?.url ?? page.url);
  let dumpUrl = $derived(
    `?${new URLSearchParams({ tab: "dump", snapshot: url.searchParams.get("snapshot") ?? "", table: mapping.section, ...(field ? { columns: JSON.stringify([field]) } : {}) })}`,
  );
</script>

<aside class="mapping-source-context" aria-label="Information source">
  <div class="mapping-source-heading">
    <span class="mapping-eyebrow">ONAGRE · {field ? "CHAMP" : "VALEUR DE RÉFÉRENCE"}</span><span
      class="mapping-source-table">{mapping.section}</span
    >
    <h3>{mapping.label}</h3>
  </div>
  {#if mapping.context}<p class="mapping-source-description">{mapping.context}</p>{/if}
  <section class="mapping-proposal-card">
    <h4>Proposition de l'équipe</h4>
    <p class:muted={!mapping.proposal}>
      {mapping.proposal ||
        "Aucune proposition dans le classeur. La correspondance reste à définir."}
    </p>
    {#if mapping.confidence}<span class="mapping-confidence"
        >Confiance indiquée · {mapping.confidence}</span
      >{/if}
  </section>
  {#if samples.length}<section class="mapping-samples">
      <h4>Exemples du dump</h4>
      <p class="onagre-context">Premières lignes de la table, sans transformation.</p>
      <ol>
        {#each samples as sample}<li class:muted={sample == null}>
            {sample == null ? "Non renseigné" : sample === "" ? '""' : sample}
          </li>{/each}
      </ol>
    </section>{/if}
  <a class="mapping-dump-link" href={dumpUrl} target="_blank" rel="noreferrer"
    >Explorer cette table<span class="fr-sr-only">, nouvel onglet</span></a
  >
</aside>
