<script lang="ts">
  import { onDestroy, untrack } from "svelte";
  import Select from "@pitchou/ui/Select.svelte";
  import type { EmailFilters } from "@pitchou/types/adminEmails.ts";
  import NotificationDateField from "./NotificationDateField.svelte";
  import { kindLabels, statusLabels, environmentLabels } from "./labels.ts";
  let {
    filters,
    onChange,
    onReset,
  }: {
    filters: EmailFilters;
    onChange: (updates: Partial<EmailFilters>) => void;
    onReset: () => void;
  } = $props();
  let panel = $state<"filter" | "sort" | null>(null);
  let searchTimer: ReturnType<typeof setTimeout> | undefined;
  let search = $state(untrack(() => filters.search));
  $effect(() => {
    search = filters.search;
  });
  onDestroy(() => clearTimeout(searchTimer));
  const activeCount = $derived(
    [
      filters.source,
      filters.kind,
      filters.status,
      filters.environment,
      filters.dateFrom,
      filters.dateTo,
      filters.overdue,
      filters.tracking,
    ].filter(Boolean).length,
  );
  const options = (labels: Record<string, string>, all: string) => [
    { value: "", label: all },
    ...Object.entries(labels).map(([value, label]) => ({ value, label })),
  ];
  function change(updates: Partial<EmailFilters>) {
    clearTimeout(searchTimer);
    onChange({ ...updates, search });
  }
  function date(field: "dateFrom" | "dateTo", value: string) {
    onChange({ [field]: value });
  }
  function sort(key: EmailFilters["sort"]) {
    change({ sort: key, order: key === filters.sort && filters.order === "asc" ? "desc" : "asc" });
  }
</script>

<div class="mail-controls">
  <div class="mail-toolbar">
    <div class="search-field" role="search">
      <span class="fr-icon-search-line fr-icon--sm" aria-hidden="true"></span>
      <label class="sr-only" for="mail-search">Rechercher un mail</label>
      <input
        id="mail-search"
        type="search"
        value={search}
        placeholder="Dossier, destinataire, objet, identifiant…"
        autocomplete="off"
        oninput={(event) => {
          search = event.currentTarget.value;
          clearTimeout(searchTimer);
          searchTimer = setTimeout(() => onChange({ search }), 300);
        }}
      />
    </div>
    <button
      class="fr-btn fr-btn--secondary fr-icon-filter-line fr-btn--icon-left"
      type="button"
      aria-expanded={panel === "filter"}
      aria-controls="mail-filter-panel"
      onclick={() => (panel = panel === "filter" ? null : "filter")}
    >
      Filtrer {#if activeCount}<span class="result-count">{activeCount}</span>{/if}
    </button>
    <button
      class="fr-btn fr-btn--secondary"
      type="button"
      aria-expanded={panel === "sort"}
      aria-controls="mail-sort-panel"
      onclick={() => (panel = panel === "sort" ? null : "sort")}
      ><svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"
        ><path
          d="M20 4V16H23L19 21L15 16H18V4H20ZM12 18V20H3V18H12ZM14 11V13H3V11H14ZM14 4V6H3V4H14Z"
        /></svg
      >Trier</button
    >
    <button
      class="notification-button reset-filters"
      title="Réinitialiser les filtres"
      aria-label="Réinitialiser les filtres"
      onclick={() => {
        clearTimeout(searchTimer);
        search = "";
        panel = null;
        onReset();
      }}
    >
      <span class="fr-icon-arrow-go-back-line fr-icon--sm" aria-hidden="true"></span><span
        >Effacer</span
      >
    </button>
  </div>
  {#if panel === "filter"}
    <fieldset id="mail-filter-panel" class="mail-panel">
      <legend>Filtrer les mails</legend>
      <div class="mail-filter-grid">
        {#each [{ key: "source", label: "Source", labels: { notification: "Notifications", cnpn: "CNPN" }, all: "Toutes les sources" }, { key: "kind", label: "Type", labels: kindLabels, all: "Tous les types" }, { key: "status", label: "État", labels: statusLabels, all: "Tous les états" }, { key: "environment", label: "Environnement", labels: environmentLabels, all: "Tous les environnements" }, { key: "tracking", label: "Suivi CNPN", labels: { received: "Réception confirmée", opened: "Ouverture détectée", unconfirmed: "Sans confirmation" }, all: "Tout le suivi CNPN" }, { key: "dateField", label: "Date à filtrer", labels: { due_at: "Envoi prévu / demande CNPN", sent_at: "Envoi accepté", created_at: "Création" }, all: "" }] as field}
          <div class="filter-select">
            <span class="control-label" id={`label-${field.key}`}>{field.label}</span>
            <Select
              id={`mail-${field.key}`}
              ariaLabel={field.label}
              options={options(field.labels, field.all).filter(
                (o) => field.key !== "dateField" || o.value,
              )}
              value={filters[field.key as keyof EmailFilters] as string}
              onChange={(value) => change({ [field.key]: value })}
            />
          </div>
        {/each}
        <NotificationDateField
          id="mail-from"
          name="from"
          label="Du"
          value={filters.dateFrom}
          onChange={(value) => date("dateFrom", value)}
        />
        <NotificationDateField
          id="mail-to"
          name="to"
          label="Au inclus"
          value={filters.dateTo}
          onChange={(value) => date("dateTo", value)}
          align="right"
        />
        <label class="overdue-toggle"
          ><input
            type="checkbox"
            checked={filters.overdue}
            onchange={(event) => change({ overdue: event.currentTarget.checked })}
          /><span class="toggle-track" aria-hidden="true"></span>Échéance dépassée</label
        >
      </div>
      {#if filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo}<p
          role="alert"
          class="date-error"
        >
          La date de fin doit suivre la date de début.
        </p>{/if}
      <p class="muted">
        Dates incluses à l'heure de Paris. Les échéances concernent les notifications. Le CNPN
        conserve uniquement les dates de suivi déjà enregistrées.
      </p>
    </fieldset>
  {:else if panel === "sort"}
    <fieldset id="mail-sort-panel" class="mail-panel">
      <legend>Trier les mails</legend>
      <div class="sort-options">
        {#each [{ key: "due_at", label: "Envoi prévu / demande CNPN" }, { key: "sent_at", label: "Envoi accepté" }, { key: "created_at", label: "Création" }, { key: "dossier", label: "Dossier" }, { key: "email", label: "Destinataire" }] as option}
          <button
            type="button"
            class="fr-btn fr-btn--sm {filters.sort === option.key ? '' : 'fr-btn--tertiary'}"
            aria-pressed={filters.sort === option.key}
            onclick={() => sort(option.key as EmailFilters["sort"])}
          >
            {option.label}{#if filters.sort === option.key}<span
                class={filters.order === "asc"
                  ? "fr-icon-arrow-up-line"
                  : "fr-icon-arrow-down-line"}
                aria-hidden="true"
              ></span><span class="sr-only"
                >{filters.order === "asc" ? "Croissant" : "Décroissant"}</span
              >{/if}
          </button>
        {/each}
      </div>
    </fieldset>
  {/if}
</div>
