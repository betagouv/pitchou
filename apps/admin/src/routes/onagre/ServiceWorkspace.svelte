<script lang="ts">
  import type { OnagreServices } from "@pitchou/types/onagreServices.ts";
  import Select from "@pitchou/ui/Select.svelte";
  import ServiceEditor from "./ServiceEditor.svelte";
  import { statusLabels } from "./mappings.ts";
  import "./services.css";
  let {
    workspace,
    snapshotId,
    writable,
  }: { workspace: OnagreServices; snapshotId: number; writable: boolean } = $props();
  let search = $state("");
  let status = $state("");
  let region = $state("");
  let selected = $state<number | null>(null);
  let currentPage = $state(1);
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase();
  let regions = $derived(
    [...new Set(workspace.services.map((service) => service.region))].sort((a, b) =>
      a.localeCompare(b, "fr"),
    ),
  );
  let matches = $derived(
    workspace.services.filter(
      (service) =>
        (!region || service.region === region) &&
        (!status ||
          (status === "changed"
            ? service.needsReview
            : (service.mapping?.status ?? "todo") === status)) &&
        normalize(
          [
            service.id,
            service.name,
            service.region,
            service.mapping?.notes,
            ...workspace.groups
              .filter((group) => service.mapping?.group_ids.includes(group.id))
              .map((group) => group.name),
          ].join(" "),
        ).includes(normalize(search)),
    ),
  );
  let totalPages = $derived(Math.max(1, Math.ceil(matches.length / 25)));
  let visible = $derived(matches.slice((currentPage - 1) * 25, currentPage * 25));
  let decided = $derived(
    workspace.services.filter(
      (service) =>
        !service.needsReview &&
        ["validated", "excluded"].includes(service.mapping?.status ?? "todo"),
    ).length,
  );
  let service = $derived(workspace.services.find((item) => item.id === selected));
  let nextId = $derived.by(() => {
    const index = matches.findIndex((item) => item.id === selected);
    return index < 0 ? null : (matches[index + 1]?.id ?? null);
  });
  function next(id: number) {
    selected = id;
    const index = matches.findIndex((item) => item.id === id);
    if (index >= 0) currentPage = Math.floor(index / 25) + 1;
  }
  $effect(() => {
    if (currentPage > totalPages) currentPage = totalPages;
  });
  let filters = $derived(JSON.stringify([search, status, region]));
  $effect(() => {
    if (filters) currentPage = 1;
  });
</script>

<section class="admin-panel service-workspace">
  <header class="service-heading">
    <div>
      <h2>Services Onagre et groupes Pitchou</h2>
      <p>
        Préparez l'affectation des demandes. Ces décisions ne modifient pas encore les dossiers.
      </p>
    </div>
    <div class="service-progress">
      <strong>{decided} / {workspace.services.length}</strong><span>correspondances décidées</span
      ><progress value={decided} max={workspace.services.length || 1}></progress>
    </div>
  </header>
  <div class="service-toolbar">
    <label class="onagre-field" for="service-search"
      >Rechercher un service<input
        id="service-search"
        class="fr-input"
        placeholder="Nom, identifiant, groupe…"
        bind:value={search}
      /></label
    >
    <div class="onagre-field">
      <label for="service-region">Région Onagre</label><Select
        id="service-region"
        options={[
          { value: "", label: "Toutes les régions" },
          ...regions.map((value) => ({ value, label: value })),
        ]}
        bind:value={region}
      />
    </div>
    <div class="onagre-field">
      <label for="service-status">Avancement</label><Select
        id="service-status"
        options={[
          { value: "", label: "Tous les statuts" },
          ...Object.entries(statusLabels).map(([value, label]) => ({ value, label })),
          { value: "changed", label: "À revoir après changement" },
        ]}
        bind:value={status}
      />
    </div>
  </div>
  <div class="service-catalog-note">
    {#if workspace.groups.length}
      {workspace.groups.filter((group) => group.active).length} groupes actifs · Référence {workspace
        .groups[0].source}, du {new Date(workspace.groups[0].refreshed_at).toLocaleDateString(
        "fr-FR",
      )}
    {:else}Aucun catalogue de groupes chargé. Les services restent consultables.{/if}
  </div>
  <div class="service-columns" aria-hidden="true">
    <span>Service Onagre</span><span>Région</span><span>Groupes Pitchou</span><span>Avancement</span
    >
  </div>
  {#each visible as row (row.id)}
    <button
      type="button"
      class="service-row"
      data-service-id={row.id}
      onclick={() => (selected = row.id)}
    >
      <span
        ><strong>{row.name}</strong><small
          >#{row.id}{row.endDate
            ? ` · Fermé le ${row.endDate}`
            : row.hidden
              ? " · Masqué dans Onagre"
              : ""}{row.absent ? " · Absent de ce dump" : ""}</small
        ></span
      >
      <span>{row.region}</span>
      <span
        >{workspace.groups
          .filter((group) => row.mapping?.group_ids.includes(group.id))
          .map((group) => group.name)
          .join(", ") ||
          (row.mapping?.status === "excluded" ? "Aucune reprise" : "À définir")}</span
      >
      <span
        class="service-status"
        class:decided={row.mapping?.status === "validated" && !row.needsReview}
        >{row.needsReview ? "À revoir" : statusLabels[row.mapping?.status ?? "todo"]}</span
      >
    </button>
  {:else}<p class="service-empty">Aucun service ne correspond aux filtres.</p>{/each}
  <footer class="service-pagination">
    <span>{matches.length} services</span><button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm"
      disabled={currentPage <= 1}
      onclick={() => currentPage--}>Précédente</button
    ><span>{currentPage} / {totalPages}</span><button
      type="button"
      class="fr-btn fr-btn--secondary fr-btn--sm"
      disabled={currentPage >= totalPages}
      onclick={() => currentPage++}>Suivante</button
    >
  </footer>
</section>
{#if service}
  {#key service.id}<ServiceEditor
      {service}
      {snapshotId}
      groups={workspace.groups}
      catalogHash={workspace.catalogHash}
      {writable}
      onClose={() => (selected = null)}
      {nextId}
      onNext={next}
    />{/key}
{/if}
