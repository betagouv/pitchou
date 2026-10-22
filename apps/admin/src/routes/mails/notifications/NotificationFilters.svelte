<script lang="ts">
  import type { NotificationFilters } from "@pitchou/types/emailNotifications.ts";
  import { kindLabels, statusLabels, environmentLabels } from "./labels.ts";
  let { filters }: { filters: NotificationFilters } = $props();
</script>

<form
  method="get"
  class="grid grid-cols-1 gap-4 border border-[var(--border-default-grey)] p-4 md:grid-cols-3"
  aria-label="Filtrer les notifications"
>
  <div class="md:col-span-3">
    <label class="fr-label" for="notification-search"
      >Rechercher un dossier, un destinataire ou un identifiant de notification</label
    ><input id="notification-search" class="fr-input" name="search" value={filters.search} />
  </div>
  {#each [{ name: "kind", title: "Type", labels: kindLabels, value: filters.kind }, { name: "status", title: "État", labels: statusLabels, value: filters.status }, { name: "environment", title: "Environnement", labels: environmentLabels, value: filters.environment }] as select}
    <div>
      <label class="fr-label" for={select.name}>{select.title}</label><select
        id={select.name}
        class="fr-select"
        name={select.name}
        value={select.value}
        ><option value="">Tous</option
        >{#each Object.entries(select.labels) as [value, label]}<option {value}>{label}</option
          >{/each}</select
      >
    </div>
  {/each}
  <div>
    <label class="fr-label" for="notification-date-field">Date à filtrer</label><select
      id="notification-date-field"
      name="dateField"
      class="fr-select"
      value={filters.dateField}
      ><option value="due_at">Envoi prévu</option><option value="sent_at">Envoi accepté</option
      ><option value="created_at">Mise en file</option></select
    >
  </div>
  <div>
    <label class="fr-label" for="notification-from">Du, heure de Paris</label><input
      class="fr-input"
      id="notification-from"
      name="from"
      type="date"
      value={filters.dateFrom}
    />
  </div>
  <div>
    <label class="fr-label" for="notification-to">Au, inclus</label><input
      class="fr-input"
      id="notification-to"
      name="to"
      type="date"
      value={filters.dateTo}
    />
  </div>
  <div class="fr-checkbox-group md:col-span-3">
    <input
      id="notification-overdue"
      name="overdue"
      type="checkbox"
      value="1"
      checked={filters.overdue}
    /><label class="fr-label" for="notification-overdue"
      >Seulement les envois en attente dont l'échéance est dépassée</label
    >
  </div>
  <div class="flex gap-4 md:col-span-3">
    <button type="submit" class="fr-btn">Filtrer</button><a
      class="fr-btn fr-btn--secondary"
      href="/mails/notifications">Réinitialiser</a
    >
  </div>
</form>
