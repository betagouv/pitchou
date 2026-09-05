<script lang="ts">
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

<div class="flex flex-col gap-4">
  <p class="fr-text--lead m-0!">Suivi des mails de saisine du CNPN envoyés depuis Pitchou.</p>

  <dl class="m-0! grid grid-cols-1 gap-4 p-0! min-[42rem]:grid-cols-3">
    {#each stats as stat}
      <div
        class="border border-solid border-[color:var(--border-default-grey)] border-t-4 border-t-[color:var(--border-action-high-blue-france)] bg-[var(--background-default-grey)] fr-p-3w"
      >
        <dt class="flex items-center gap-2 fr-text--bold fr-mb-2w">
          <span class={stat.icon} aria-hidden="true"></span>
          {stat.label}
        </dt>
        <dd class="fr-m-0">
          <strong class="fr-display--sm block fr-mb-1w">{stat.value}</strong>
          <span class="fr-hint-text">{stat.detail}</span>
        </dd>
      </div>
    {/each}
  </dl>

  <p class="fr-hint-text m-0!">
    Les distributions et ouvertures concernent le destinataire principal. Une ouverture détectée ne
    garantit pas que le message a été lu intégralement.
  </p>
</div>
