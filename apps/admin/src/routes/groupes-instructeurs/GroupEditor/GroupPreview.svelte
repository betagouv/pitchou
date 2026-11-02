<script lang="ts">
  import type { GroupPreview } from "@pitchou/types/groupRouting.ts";
  let { preview, name = "" }: { preview: GroupPreview; name?: string } = $props();
  const changes = $derived([
    { label: "Dossiers ajoutés", result: preview.added },
    { label: "Dossiers retirés", result: preview.removed },
    { label: "Passages à l'instruction", result: preview.upgraded },
    { label: "Passages en lecture complète", result: preview.downgraded },
  ]);
  const hasChanges = $derived(changes.some((item) => item.result.count > 0));
</script>

<section class="group-preview" aria-label="Aperçu des affectations">
  <p class="introduction">
    Ces changements seront appliqués à l'enregistrement du groupe{name ? ` « ${name} »` : ""}.
  </p>
  <dl class="counts">
    {#each changes as item}
      <div>
        <dt>{item.label}</dt>
        <dd>{item.result.count.toLocaleString("fr-FR")}</dd>
      </div>
    {/each}
  </dl>
  <p class="notification-note">Aucun e-mail d'arrivée ne sera envoyé pour ce recalcul.</p>
  {#if hasChanges}
    <h3>Dossiers concernés</h3>
    <p class="details-help">Dépliez une catégorie pour consulter les dossiers concernés.</p>
  {:else}
    <p class="unchanged">Aucune affectation ne change.</p>
  {/if}
  {#each changes as item}
    {#if item.result.count}
      <details>
        <summary>{item.label} · {item.result.count.toLocaleString("fr-FR")}</summary>
        <ul>
          {#each item.result.dossiers as dossier}
            <li>
              <a href={`/dossiers/${dossier.id}`} target="_blank" rel="noreferrer"
                >{dossier.name || "Dossier sans nom"} · #{dossier.id}<span class="sr-only">
                  , nouvel onglet</span
                ></a
              >
            </li>
          {/each}
        </ul>
        {#if item.result.count > item.result.dossiers.length}<p>
            {item.result.dossiers.length} dossiers affichés sur {item.result.count.toLocaleString(
              "fr-FR",
            )}.
          </p>{/if}
      </details>
    {/if}
  {/each}
</section>

<style>
  .group-preview {
    padding: 1.5rem;
  }
  .introduction {
    margin: 0 0 1.25rem;
    overflow-wrap: anywhere;
  }
  .counts {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
    margin: 0;
  }
  .counts > div {
    display: flex;
    flex-direction: column-reverse;
    gap: 0.25rem;
    padding: 1rem;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.5rem;
    background: var(--background-alt-grey);
  }
  dt {
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  dd {
    margin: 0;
    color: var(--text-action-high-blue-france);
    font-size: 1.75rem;
    font-weight: 700;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
  }
  .notification-note,
  .details-help {
    color: var(--text-mention-grey);
    font-size: 0.875rem;
  }
  .notification-note {
    margin: 1rem 0 1.5rem;
  }
  h3 {
    margin: 0 0 0.5rem;
    font-size: 1rem;
  }
  .details-help {
    margin: 0 0 1rem;
  }
  .unchanged {
    margin: 0;
  }
  details {
    border-top: 1px solid var(--border-default-grey);
  }
  summary {
    padding: 1rem 0;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
  }
  ul {
    margin: 0 0 1rem;
    padding-left: 1.25rem;
  }
  li {
    margin: 0.5rem 0;
    overflow-wrap: anywhere;
  }
  @media (max-width: 30rem) {
    .group-preview {
      padding: 1rem;
    }
  }
</style>
