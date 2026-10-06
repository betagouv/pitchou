<script lang="ts">
  import PageHelp from "$lib/components/PageHelp.svelte";
  import type { PageData } from "./$types";

  let { data }: { data: PageData } = $props();

  const stats = $derived([
    {
      label: "Mails envoyés",
      value: data.stats.sentCount,
      detail: "Envois acceptés par Brevo",
      icon: "fr-icon-send-plane-line",
    },
    {
      label: "Mails reçus par le CNPN",
      value: data.stats.deliveredCount,
      detail: "Distributions confirmées par Brevo",
      icon: "fr-icon-checkbox-circle-line",
    },
    {
      label: "Mails ouverts",
      value: data.stats.openedCount,
      detail: "Ouvertures détectées par Brevo",
      icon: "fr-icon-mail-open-line",
    },
  ]);
</script>

<svelte:head>
  <title>Administration - mails - Pitchou</title>
</svelte:head>

<PageHelp title="Mails">
  <h3>Suivi des saisines du CNPN</h3>
  <p>Cette page suit les mails de saisine du CNPN envoyés depuis Pitchou.</p>
  <h3>Lecture des indicateurs</h3>
  <ul>
    <li>Les mails envoyés correspondent aux envois acceptés par Brevo.</li>
    <li>Les mails reçus correspondent aux distributions confirmées par Brevo.</li>
    <li>Les mails ouverts correspondent aux ouvertures détectées par Brevo.</li>
  </ul>
  <h3>Destinataires et ouvertures</h3>
  <p>
    Les distributions et ouvertures concernent le destinataire principal. Une ouverture détectée ne
    garantit pas que le message a été lu intégralement.
  </p>
</PageHelp>

<section class="mail-summary" aria-labelledby="mail-summary-title">
  <header>
    <span class="fr-icon-mail-line fr-icon--sm" aria-hidden="true"></span>
    <h2 id="mail-summary-title">Saisines du CNPN</h2>
  </header>
  <dl>
    {#each stats as stat}
      <div class="stat">
        <dt>
          <span class="stat-icon {stat.icon} fr-icon--sm" aria-hidden="true"></span>
          {stat.label}
        </dt>
        <dd>
          <strong class="stat-value">{stat.value.toLocaleString("fr-FR")}</strong>
          <span class="stat-detail">{stat.detail}</span>
        </dd>
      </div>
    {/each}
  </dl>
</section>

<style>
  .mail-summary {
    overflow: hidden;
    border: 1px solid var(--border-default-grey);
    border-radius: 0.75rem;
    background: var(--background-lifted-grey);
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid var(--border-default-grey);
  }
  header > span {
    color: var(--text-mention-grey);
  }
  h2 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }
  dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    margin: 0;
    padding: 0;
  }
  .stat {
    min-width: 0;
    padding: 1.25rem;
  }
  .stat + .stat {
    border-left: 1px solid var(--border-default-grey);
  }
  dt {
    display: flex;
    align-items: center;
    gap: 0.625rem;
    margin: 0 0 0.75rem;
    padding: 0;
    font-size: 0.875rem;
    font-weight: 500;
  }
  .stat-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    flex-shrink: 0;
    border-radius: 0.5rem;
    background: var(--background-action-low-blue-france);
    color: var(--text-action-high-blue-france);
  }
  dd {
    margin: 0;
    padding: 0;
  }
  .stat-value {
    display: block;
    font-size: 2rem;
    line-height: 1.25;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
    color: var(--text-title-grey);
  }
  .stat-detail {
    display: block;
    margin-top: 0.375rem;
    font-size: 0.8125rem;
    color: var(--text-mention-grey);
  }
  @media (max-width: 767px) {
    dl {
      grid-template-columns: 1fr;
    }
    .stat {
      padding: 1rem;
    }
    .stat + .stat {
      border-left: 0;
      border-top: 1px solid var(--border-default-grey);
    }
  }
</style>
