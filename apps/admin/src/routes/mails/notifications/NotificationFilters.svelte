<script lang="ts">
  import { untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type { NotificationFilters } from "@pitchou/types/emailNotifications.ts";
  import NotificationDateField from "./NotificationDateField.svelte";
  import { kindLabels, statusLabels, environmentLabels } from "./labels.ts";
  let { filters }: { filters: NotificationFilters } = $props();
  let expanded = $state(false);
  const activeCount = $derived(
    [
      filters.kind,
      filters.status,
      filters.environment,
      filters.dateFrom,
      filters.dateTo,
      filters.overdue,
    ].filter(Boolean).length,
  );
  let draft = $state(untrack(() => ({ ...filters })));
  $effect(() => {
    draft = { ...filters };
  });
  const options = (labels: Record<string, string>, all: string) => [
    { value: "", label: all },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ];
</script>

<form
  method="get"
  class="notification-filters"
  data-expanded={expanded}
  aria-label="Filtrer les notifications"
>
  <div class="filter-main">
    <div class="search-field">
      <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
      <label class="sr-only" for="notification-search"
        >Rechercher un dossier, un destinataire ou une notification</label
      >
      <input
        id="notification-search"
        type="search"
        name="search"
        bind:value={draft.search}
        placeholder="Dossier, destinataire, identifiant…"
        autocomplete="off"
      />
      <button type="submit" class="mobile-search" aria-label="Lancer la recherche"
        ><span class="fr-icon-arrow-right-line fr-icon--sm" aria-hidden="true"></span></button
      >
    </div>
    <button
      type="button"
      class="notification-button mobile-filters"
      aria-expanded={expanded}
      aria-controls="notification-kind-filter notification-status-filter notification-environment-filter notification-secondary"
      onclick={() => {
        expanded = !expanded;
      }}
      ><span class="fr-icon-filter-line fr-icon--sm" aria-hidden="true"
      ></span>Filtres{#if activeCount}<span class="result-count"
          >{activeCount} actif{activeCount > 1 ? "s" : ""}</span
        >{/if}<span
        class={expanded
          ? "fr-icon-arrow-up-s-line fr-icon--sm"
          : "fr-icon-arrow-down-s-line fr-icon--sm"}
        aria-hidden="true"
      ></span></button
    >
    {#each [{ name: "kind", title: "Type", labels: kindLabels, all: "Tous les types" }, { name: "status", title: "État", labels: statusLabels, all: "Tous les états" }, { name: "environment", title: "Environnement", labels: environmentLabels, all: "Tous les environnements" }] as field}
      <div class="filter-select collapsible" id={`notification-${field.name}-filter`}>
        <Select
          id={`notification-${field.name}`}
          ariaLabel={field.title}
          options={options(field.labels, field.all)}
          value={draft[field.name as "kind" | "status" | "environment"]}
          onChange={(value) => {
            draft[field.name as "kind" | "status" | "environment"] = value;
          }}
        />
        <input
          type="hidden"
          name={field.name}
          value={draft[field.name as "kind" | "status" | "environment"]}
        />
      </div>
    {/each}
  </div>
  <div id="notification-secondary" class="filter-secondary collapsible">
    <div class="filter-select date-kind">
      <Select
        id="notification-date-field"
        ariaLabel="Date à filtrer"
        value={draft.dateField}
        options={[
          { value: "due_at", label: "Envoi prévu" },
          { value: "sent_at", label: "Envoi accepté" },
          { value: "created_at", label: "Mise en file" },
        ]}
        onChange={(value) => {
          draft.dateField = value as NotificationFilters["dateField"];
        }}
      />
      <input type="hidden" name="dateField" value={draft.dateField} />
    </div>
    <NotificationDateField
      id="notification-from"
      name="from"
      label="Du"
      value={draft.dateFrom}
      onChange={(value) => {
        draft.dateFrom = value;
      }}
    />
    <NotificationDateField
      id="notification-to"
      name="to"
      label="Au inclus"
      value={draft.dateTo}
      onChange={(value) => {
        draft.dateTo = value;
      }}
      align="right"
    />
    <label class="overdue-toggle">
      <input name="overdue" type="checkbox" value="1" bind:checked={draft.overdue} />
      <span class="toggle-track" aria-hidden="true"></span>Échéance dépassée
    </label>
    <div class="filter-actions">
      <button type="submit" class="notification-button primary">Appliquer</button>
      <a
        class="notification-button"
        href="/mails/notifications"
        aria-label="Réinitialiser les filtres"
        title="Réinitialiser les filtres"
        ><span class="fr-icon-refresh-line fr-icon--sm" aria-hidden="true"></span><span
          class="reset-label">Effacer</span
        ></a
      >
    </div>
  </div>
</form>
