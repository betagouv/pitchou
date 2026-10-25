<script lang="ts">
  import type { OnagreMapping } from "@pitchou/types/onagre.ts";
  let { mapping }: { mapping: OnagreMapping } = $props();
  let open = $state(false);
  let details = $state(false);
  let original = $derived(mapping.originalWorkbook);
  let proposal = $derived(original?.proposal ?? mapping.proposal);
  let confidence = $derived(original?.confidence ?? mapping.confidence);
</script>

{#if original || proposal || confidence}
  <section class="mapping-proposal-card">
    <button
      type="button"
      class="mapping-original-toggle"
      aria-expanded={open}
      aria-controls="mapping-original-proposal"
      onclick={() => (open = !open)}
    >
      Proposition d'origine<span
        class={open
          ? "fr-icon-arrow-up-s-line fr-icon--sm"
          : "fr-icon-arrow-down-s-line fr-icon--sm"}
        aria-hidden="true"
      ></span>
    </button>
    {#if open}
      <div id="mapping-original-proposal" class="workbook-original">
        {#if original}<p class="onagre-context">
            Classeur de l'équipe · {original.sheet} · ligne {original.row}
          </p>{/if}
        {#if proposal}<p>{proposal}</p>{/if}
        {#if confidence}<p><strong>Niveau de confiance d'origine</strong><br />{confidence}</p>{/if}
        {#if original?.comment}<p>
            <strong>Commentaire d'origine</strong><br />{original.comment}
          </p>{/if}
        {#if original?.sharedNotes.length}
          <div class="workbook-shared">
            <h4>Notes communes à la feuille {original.sheet}</h4>
            {#each original.sharedNotes as note}<p>{note}</p>{/each}
          </div>
        {/if}
        {#if original?.details.length}
          <button
            type="button"
            class="mapping-original-toggle"
            aria-expanded={details}
            aria-controls="mapping-workbook-details"
            onclick={() => (details = !details)}
          >
            {details ? "Masquer les valeurs source" : "Voir les valeurs source de cette ligne"}
          </button>
          {#if details}<dl id="mapping-workbook-details">
              {#each original.details as cell}<div>
                  <dt>{cell.label}</dt>
                  <dd>{cell.value}</dd>
                </div>{/each}
            </dl>{/if}
        {/if}
      </div>
    {/if}
  </section>
{/if}

<style>
  .workbook-original p,
  dd {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .workbook-shared {
    border-top: 1px solid var(--border-default-grey);
    padding-top: 1rem;
  }
  .workbook-shared h4 {
    font-size: 1rem;
  }
  dl {
    margin: 0;
  }
  dl > div {
    padding: 0.5rem 0;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
  }
</style>
