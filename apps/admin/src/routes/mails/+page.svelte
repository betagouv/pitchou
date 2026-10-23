<script lang="ts">
  import { navigating } from "$app/state";
  import { goto } from "$app/navigation";
  import { untrack } from "svelte";
  import type { PageData } from "./$types";
  import type { EmailFilters, EmailRow } from "@pitchou/types/adminEmails.ts";
  import MailControls from "./MailControls.svelte";
  import MailTable from "./MailTable.svelte";
  import MailDetails from "./MailDetails.svelte";
  import { emailListUrl, defaultEmailFilters } from "./query.ts";
  import { kindLabels } from "./labels.ts";
  import "./monitoring.css";
  import "./mails.css";
  let { data }: { data: PageData } = $props();
  let query = $state(untrack(() => ({ ...data.filters })));
  let trigger = $state<HTMLElement | null>(null);
  let navigationError = $state("");
  $effect(() => {
    query = { ...data.filters, page: data.overview.page };
  });
  const pageCount = $derived(Math.max(1, Math.ceil(data.overview.total / 20)));
  const count = (...statuses: string[]) =>
    data.overview.counts
      .filter((row) => statuses.includes(row.status))
      .reduce((sum, row) => sum + row.count, 0);
  let requestId = 0;
  async function navigate(next: EmailFilters, replaceState = false) {
    const id = ++requestId;
    query = next;
    if (next.dateFrom && next.dateTo && next.dateFrom > next.dateTo) return;
    navigationError = "";
    try {
      await goto(emailListUrl(next), { reset: false, replace: replaceState });
    } catch {
      if (id === requestId) navigationError = "Le chargement a échoué. Réessayez.";
    }
  }
  function change(updates: Partial<EmailFilters>) {
    navigate({ ...query, ...updates, page: 1, email: "" }, true);
  }
  function open(row: EmailRow, element: HTMLElement) {
    trigger = element;
    element.focus({ preventScroll: true });
    navigate({ ...query, email: `${row.source}:${row.id}` });
  }
  function close() {
    navigate({ ...query, email: "" }, true);
  }
</script>

<svelte:head><title>Administration - mails - Pitchou</title></svelte:head>
<div class="notification-monitor" aria-busy={!!navigating.to}>
  <section class="summary" aria-label="Répartition des résultats filtrés">
    {#each [{ label: "En attente", states: ["pending"], status: "pending" }, { label: "Acceptés par l’expéditeur", states: ["sent"], status: "sent" }, { label: "À vérifier", states: ["failed", "uncertain"], status: "uncertain" }, { label: "Annulés ou bloqués", states: ["cancelled", "suppressed"], status: "cancelled" }] as card}
      <div class="summary-card" data-status={card.status}>
        <span class="summary-label"
          ><span class="status-dot" aria-hidden="true"></span>{card.label}</span
        ><strong>{count(...card.states).toLocaleString("fr-FR")}</strong><span class="summary-types"
          >{data.overview.counts
            .filter((row) => card.states.includes(row.status))
            .map(
              (row) =>
                `${row.count} ${row.kind === "cnpn" ? "CNPN" : kindLabels[row.kind].toLowerCase() + (row.count > 1 ? "s" : "")}`,
            )
            .join(" · ") || "Aucun envoi"}</span
        >
      </div>
    {/each}
    <div class="summary-card cnpn-summary">
      <span class="summary-label">Suivi CNPN</span>
      <div><span>Mails reçus par le CNPN</span><strong>{data.overview.cnpn.received}</strong></div>
      <div><span>Mails ouverts</span><strong>{data.overview.cnpn.opened}</strong></div>
    </div>
  </section>
  <MailControls
    filters={query}
    onChange={change}
    onReset={() => navigate(defaultEmailFilters(), true)}
  />
  {#if navigationError}<p role="alert" class="fr-alert fr-alert--error">{navigationError}</p>{/if}
  <section class="send-list" aria-labelledby="mail-list-title">
    <header class="list-heading">
      <div class="list-title">
        <h2 id="mail-list-title">Historique des envois</h2>
        <span class="result-count" aria-live="polite"
          >{data.overview.total.toLocaleString("fr-FR")}</span
        >{#if navigating.to}<span class="muted" role="status">Chargement…</span>{/if}
      </div>
      <span class="muted">Dates à l'heure de Paris</span>
    </header>
    <p class="list-help">
      Accepté par l'expéditeur ne signifie pas livré. Cliquez sur un mail pour consulter ses
      détails.
    </p>
    {#if data.overview.rows.length}<MailTable rows={data.overview.rows} onOpen={open} />{:else}<div
        class="notification-empty"
        role="status"
      >
        <span class="fr-icon-search-line" aria-hidden="true"></span>
        <h3>Aucun mail trouvé</h3>
        <p>Essayez une autre recherche ou élargissez la période.</p>
        <a class="notification-button" href="/mails">Effacer les filtres</a>
      </div>{/if}
    <nav aria-label="Pagination des mails" class="notification-pagination">
      <span class="muted"
        >{data.overview.total ? (data.overview.page - 1) * 20 + 1 : 0}–{Math.min(
          data.overview.page * 20,
          data.overview.total,
        )} sur {data.overview.total} envois</span
      >
      <div>
        <button
          class="notification-button"
          aria-label="Page précédente"
          disabled={data.overview.page <= 1}
          onclick={() => navigate({ ...query, page: data.overview.page - 1, email: "" })}
          ><span class="fr-icon-arrow-left-s-line fr-icon--sm" aria-hidden="true"></span><span
            class="page-direction">Précédente</span
          ></button
        >
        <span class="page-current">Page {data.overview.page} sur {pageCount}</span>
        <button
          class="notification-button"
          aria-label="Page suivante"
          disabled={data.overview.page >= pageCount}
          onclick={() => navigate({ ...query, page: data.overview.page + 1, email: "" })}
          ><span class="page-direction">Suivante</span><span
            class="fr-icon-arrow-right-s-line fr-icon--sm"
            aria-hidden="true"
          ></span></button
        >
      </div>
    </nav>
  </section>
  {#if data.filters.email}<MailDetails
      detail={data.overview.detail}
      onClose={close}
      {trigger}
    />{/if}
</div>
