<script lang="ts">
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import NotificationFilters from "./NotificationFilters.svelte";
  import NotificationHistory from "./NotificationHistory.svelte";
  import NotificationTable from "./NotificationTable.svelte";
  import { kindLabels, statusLabels } from "./labels.ts";
  import "./monitoring.css";
  let { data }: { data: PageData } = $props();
  const pageCount = $derived(Math.max(1, Math.ceil(data.overview.total / 20)));
  function link(updates: Record<string, string>) {
    const params = new URLSearchParams(page.url.search);
    for (const [key, value] of Object.entries(updates)) params.set(key, value);
    return `/mails/notifications?${params}`;
  }
  const count = (status: string) =>
    data.overview.counts
      .filter((row) => row.status === status)
      .reduce((total, row) => total + row.count, 0);
</script>

<svelte:head><title>Administration - notifications par mail - Pitchou</title></svelte:head>
<div class="notification-monitor">
  <header class="monitor-intro">
    <div>
      <p class="intro-title">Les envois, en un coup d'œil</p>
      <p class="muted">Arrivées, attributions et nouveautés · Lecture seule</p>
    </div>
    <a class="notification-button" href="/evenements"
      ><span class="fr-icon-line-chart-line fr-icon--sm" aria-hidden="true"></span>Événements AARRI<span
        class="fr-icon-arrow-right-s-line fr-icon--sm"
        aria-hidden="true"
      ></span></a
    >
  </header>
  <section class="summary" aria-label="Répartition des résultats filtrés">
    {#each Object.entries(statusLabels) as [status, label]}
      <div class="summary-card" data-status={status}>
        <span class="summary-label"><span class="status-dot" aria-hidden="true"></span>{label}</span
        >
        <strong>{count(status).toLocaleString("fr-FR")}</strong>
        <span class="summary-types"
          >{#each Object.entries(kindLabels) as [kind, kindLabel], index}{@const amount =
              data.overview.counts.find((row) => row.kind === kind && row.status === status)
                ?.count ?? 0}{index ? " · " : ""}{amount}
            {kindLabel.toLowerCase()}{amount > 1 ? "s" : ""}{/each}</span
        >
      </div>
    {/each}
  </section>
  <NotificationFilters filters={data.filters} />
  <section class="send-list" aria-labelledby="notification-list-title">
    <header class="list-heading">
      <div class="list-title">
        <h2 id="notification-list-title">Historique des envois</h2>
        <span class="result-count" aria-live="polite"
          >{data.overview.total.toLocaleString("fr-FR")}</span
        >
      </div>
      <span class="muted">Dates à l'heure de Paris</span>
    </header>
    <p class="list-help">
      Accepté = pris en charge par l'expéditeur, sans confirmation de livraison.
    </p>
    {#if data.overview.rows.length === 0}
      <div class="notification-empty" role="status">
        <span class="fr-icon-search-line" aria-hidden="true"></span>
        <h3>Aucun envoi trouvé</h3>
        <p>
          Aucune notification pour ces filtres. Essayez une autre recherche ou élargissez la
          période.
        </p>
        <a class="notification-button" href="/mails/notifications">Effacer les filtres</a>
      </div>
    {:else}<NotificationTable
        rows={data.overview.rows}
        {link}
        selected={data.filters.notification}
      />{/if}
    <nav aria-label="Pagination des notifications" class="notification-pagination">
      <span class="muted"
        >{data.overview.total ? (data.filters.page - 1) * 20 + 1 : 0}–{Math.min(
          data.filters.page * 20,
          data.overview.total,
        )} sur {data.overview.total} envois</span
      >
      <div>
        {#if data.filters.page > 1}<a
            class="notification-button"
            href={link({ page: String(data.filters.page - 1) })}
            aria-label="Page précédente"
            ><span class="fr-icon-arrow-left-s-line fr-icon--sm" aria-hidden="true"></span><span
              class="page-direction">Précédente</span
            ></a
          >{:else}<button class="notification-button" disabled aria-label="Page précédente"
            ><span class="fr-icon-arrow-left-s-line fr-icon--sm" aria-hidden="true"></span></button
          >{/if}
        <span class="page-current">Page {data.filters.page} sur {pageCount}</span>
        {#if data.filters.page < pageCount}<a
            class="notification-button"
            href={link({ page: String(data.filters.page + 1) })}
            aria-label="Page suivante"
            ><span class="page-direction">Suivante</span><span
              class="fr-icon-arrow-right-s-line fr-icon--sm"
              aria-hidden="true"
            ></span></a
          >{:else}<button class="notification-button" disabled aria-label="Page suivante"
            ><span class="fr-icon-arrow-right-s-line fr-icon--sm" aria-hidden="true"></span></button
          >{/if}
      </div>
    </nav>
  </section>
  {#if data.filters.notification}<NotificationHistory
      id={data.filters.notification}
      history={data.overview.history}
      closeHref={link({ notification: "" })}
    />{/if}
</div>
