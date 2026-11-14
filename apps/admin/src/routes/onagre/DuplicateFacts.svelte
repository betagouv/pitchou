<script lang="ts">
  import type { DuplicateFacts } from "@pitchou/types/onagreDuplicates.ts";
  let { facts }: { facts: DuplicateFacts } = $props();
  const date = (value: string | null) =>
    value ? value.slice(0, 10).split("-").reverse().join("/") : "Non renseigné";
</script>

<dl>
  <div>
    <dt>Référence Onagre</dt>
    <dd>{facts.reference || "Non renseignée"}</dd>
  </div>
  <div>
    <dt>Dépôt</dt>
    <dd>{date(facts.deposit)}</dd>
  </div>
  <div>
    <dt>Signature des décisions</dt>
    <dd>{facts.signatures.length ? facts.signatures.map(date).join(", ") : "Non renseignée"}</dd>
  </div>
  <div>
    <dt>Départements</dt>
    <dd>{facts.departments.join(", ") || "Non renseignés"}</dd>
  </div>
  <div>
    <dt>Communes</dt>
    <dd>{facts.communes.join(", ") || "Non renseignées"}</dd>
  </div>
</dl>
{#if facts.locationCorrection}
  {@const correction = facts.locationCorrection}
  <p>
    {correction.reason}
    <a
      href={`${correction.evidence.url}#page=${correction.evidence.articlePage}`}
      target="_blank"
      rel="noopener noreferrer">{correction.evidence.title}</a
    >.
  </p>
  <details>
    <summary>Valeur Onagre d’origine et justification</summary>
    <p>{correction.originalDepartments.join(", ")}</p>
    <p>{correction.scopeMatch}</p>
    <p>Pages du recueil : {correction.evidence.physicalPages.join(", ")}.</p>
  </details>
{/if}

<style>
  dl {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    gap: 0.75rem;
    margin: 0.75rem 0;
  }
  dt {
    font-size: 0.85rem;
    color: var(--text-mention-grey);
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
</style>
