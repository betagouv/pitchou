<script lang="ts">
  import { page } from "$app/state";
  import type { PageData } from "./$types";
  import NotificationFilters from "./NotificationFilters.svelte";
  import NotificationHistory from "./NotificationHistory.svelte";
  import {
    kindLabels,
    statusLabels,
    environmentLabels,
    reasonLabels,
    formatDate,
  } from "./labels.ts";
  let { data }: { data: PageData } = $props();
  const pageSize = 20;
  function link(updates: Record<string, string>) {
    const params = new URLSearchParams(page.url.search);
    for (const [key, value] of Object.entries(updates)) params.set(key, value);
    return `/mails/notifications?${params}`;
  }
</script>

<svelte:head><title>Administration - notifications par mail - Pitchou</title></svelte:head>
<div class="flex flex-col gap-6">
  <a class="fr-link" href="/evenements"
    >Consulter les événements AARRI, dont les changements de paramètres</a
  >
  <p class="fr-text--lead fr-mb-0">Suivi des arrivées, attributions et nouveautés par mail.</p>
  <p class="fr-mb-0">
    « Accepté par l'expéditeur » signifie que Brevo ou la boîte locale a accepté le message. La
    réception, les rebonds et les ouvertures ne sont pas suivis ici. Cette page est en lecture
    seule.
  </p>
  <NotificationFilters filters={data.filters} />
  <section aria-labelledby="notification-counts-title">
    <h2 id="notification-counts-title" class="fr-h5">Répartition des résultats</h2>
    <div class="grid gap-4 md:grid-cols-3">
      {#each Object.entries(kindLabels) as [kind, label]}
        <div class="border border-[var(--border-default-grey)] p-4">
          <h3 class="fr-h6">{label}</h3>
          <dl>
            {#each Object.entries(statusLabels) as [status, statusLabel]}
              <div class="flex justify-between gap-4">
                <dt>{statusLabel}</dt>
                <dd class="font-bold">
                  {data.overview.counts.find(
                    (count) => count.kind === kind && count.status === status,
                  )?.count ?? 0}
                </dd>
              </div>
            {/each}
          </dl>
        </div>
      {/each}
    </div>
  </section>
  <section aria-labelledby="notification-list-title">
    <h2 id="notification-list-title" class="fr-h5">Envois, {data.overview.total} résultat(s)</h2>
    <p class="fr-hint-text">
      Dates affichées à l'heure de Paris. Un échec reste en attente pendant les reprises. Un état
      incertain nécessite une vérification auprès du prestataire. Les anciennes tentatives ne sont
      pas reconstituées.
    </p>
    {#if data.overview.rows.length === 0}<p role="status">Aucune notification pour ces filtres.</p>
    {:else}
      <div class="overflow-x-auto" role="region" aria-label="Tableau des envois">
        <table class="w-full border-collapse text-left text-sm">
          <caption class="sr-only">Historique des envois de notifications</caption><thead
            ><tr>
              {#each ["Type / dossier", "Destinataire", "Envoi prévu / accepté", "État / environnement", "Tentatives / diagnostic"] as heading}<th
                  scope="col"
                  class="border-b p-3">{heading}</th
                >{/each}
            </tr></thead
          ><tbody>
            {#each data.overview.rows as row}
              <tr
                ><td class="border-b p-3 align-top"
                  ><strong>{kindLabels[row.kind]}</strong><br /><a href={`/dossiers/${row.dossier}`}
                    >#{row.dossier} · {row.dossier_name ?? "Dossier sans titre"}</a
                  ><br /><a class="text-xs break-all" href={link({ notification: row.id })}
                    >Historique : {row.id}</a
                  ></td
                >
                <td class="border-b p-3 align-top"
                  >{[row.first_names, row.last_name].filter(Boolean).join(" ") ||
                    "Nom non renseigné"}<br />{row.email ?? "Adresse absente"}<br /><span
                    class="fr-hint-text">Personne #{row.personne}</span
                  ></td
                >
                <td class="border-b p-3 align-top"
                  >{formatDate(row.due_at)}<br /><span class="fr-hint-text"
                    >Accepté : {formatDate(row.sent_at)}</span
                  ></td
                >
                <td class="border-b p-3 align-top"
                  ><strong>{statusLabels[row.status]}</strong><br />{environmentLabels[
                    row.environment
                  ]}</td
                >
                <td class="border-b p-3 align-top"
                  >{row.attempt_count} tentative(s)
                  {#if row.last_error}<br />{reasonLabels[row.last_error] ?? row.last_error}{/if}
                  {#if row.cancellation_reason}<br />{reasonLabels[row.cancellation_reason] ??
                      row.cancellation_reason}{/if}
                  {#if row.retry_at && row.status === "pending"}<br />Reprise : {formatDate(
                      row.retry_at,
                    )}{/if}
                  {#if row.provider_message_id}<br /><span class="break-all"
                      >{row.provider_message_id}</span
                    >{/if}
                </td></tr
              >
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
    <nav aria-label="Pagination des notifications" class="mt-4 flex flex-wrap items-center gap-4">
      {#if data.filters.page > 1}<a
          class="fr-btn fr-btn--secondary"
          href={link({ page: String(data.filters.page - 1) })}>Précédente</a
        >{/if}
      <span
        >Page {data.filters.page} sur {Math.max(1, Math.ceil(data.overview.total / pageSize))}</span
      >
      {#if data.filters.page * pageSize < data.overview.total}<a
          class="fr-btn fr-btn--secondary"
          href={link({ page: String(data.filters.page + 1) })}>Suivante</a
        >{/if}
    </nav>
  </section>
  {#if data.filters.notification}<NotificationHistory
      id={data.filters.notification}
      history={data.overview.history}
    />{/if}
</div>
