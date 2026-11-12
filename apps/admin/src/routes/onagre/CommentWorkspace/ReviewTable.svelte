<script lang="ts">
  import { commentOutcomes, type CommentWorkspace } from "@pitchou/types/onagreComments.ts";
  let {
    groups,
    groupLink,
  }: { groups: CommentWorkspace["groups"]; groupLink: (id: string) => string } = $props();
</script>

<div class="onagre-table-scroll">
  <table>
    <thead><tr><th>Texte Onagre</th><th>Contexte</th><th>Projets</th><th>Demandes</th></tr></thead>
    <tbody>
      {#each groups as group (group.id)}
        {@const handled = (group.decision?.outcome ?? "pending") !== "pending"}
        {@const status = handled ? "Traité" : "À traiter"}
        <tr class="review-row" class:handled>
          <td class="source-text">
            <a
              class="row-link"
              href={groupLink(group.id)}
              title={`${status} — ${commentOutcomes[group.decision?.outcome ?? "pending"]}`}
            >
              <span
                class={handled ? "fr-icon-checkbox-circle-line" : "fr-icon-time-line"}
                aria-hidden="true"
              ></span>
              {group.value}<span class="fr-sr-only"> — {status}</span>
            </a>
          </td>
          <td
            >{group.payload.context.activities?.join(" · ") || "Activité non résolue"}<br
            />{group.payload.context.classifications?.join(" · ") ||
              "Classification non résolue"}{#if group.payload.context.method}<br />Méthode : {group
                .payload.context.method}{/if}</td
          >
          <td>{group.project_count.toLocaleString("fr-FR")}</td>
          <td>{group.demande_count.toLocaleString("fr-FR")}</td>
        </tr>
      {:else}<tr><td colspan="4">Aucun groupe pour ces filtres.</td></tr>{/each}
    </tbody>
  </table>
</div>

<style>
  .source-text {
    min-width: 18rem;
    max-width: 38rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  td {
    vertical-align: top;
  }
  .review-row {
    position: relative;
    --row-background: var(--background-contrast-warning);
    --row-hover: var(--background-contrast-warning-hover);
    --row-status: var(--text-default-warning);
  }
  .review-row.handled {
    --row-background: var(--background-contrast-success);
    --row-hover: var(--background-contrast-success-hover);
    --row-status: var(--text-default-success);
  }
  .review-row td {
    background: var(--row-background);
  }
  .review-row:hover td,
  .review-row:focus-within td {
    background: var(--row-hover);
  }
  .row-link {
    --hover-tint: transparent;
    --active-tint: transparent;
    color: inherit;
    background-color: transparent;
    background-image: none;
    text-decoration: none;
  }
  .row-link::after {
    content: "";
    position: absolute;
    inset: 0;
  }
  .row-link:focus-visible {
    outline: none;
  }
  .row-link:focus-visible::after {
    outline: 2px solid var(--border-action-high-blue-france);
    outline-offset: -2px;
  }
  .row-link > [aria-hidden] {
    color: var(--row-status);
    margin-right: 0.35rem;
  }
</style>
