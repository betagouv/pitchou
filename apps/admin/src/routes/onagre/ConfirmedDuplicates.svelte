<script lang="ts">
  import {
    confirmationLabels,
    type ConfirmedDuplicate,
  } from "@pitchou/types/onagreConfirmedDuplicates.ts";
  import ConfirmedMatch from "./ConfirmedDuplicates/ConfirmedMatch.svelte";
  let { links }: { links: ConfirmedDuplicate[] } = $props();
  let search = $state("");
  let profile = $state("");
  let offset = $state(0);
  const size = 20;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase();
  let projects = $derived(new Set(links.map((link) => link.projectId)).size);
  let dossiers = $derived(new Set(links.map((link) => link.target.id)).size);
  let related = $derived(
    new Set(links.flatMap((link) => link.relatedExisting.map((r) => r.dossierId))).size,
  );
  let results = $derived(
    links.filter(
      (link) =>
        (!profile || link.profile === profile) &&
        normalize(
          [
            link.projectName,
            link.projectId,
            link.source.id,
            link.source.reference,
            link.target.id,
            link.target.name,
            link.target.reference,
            link.reason,
            ...link.source.communes,
            ...link.source.departments,
          ].join(" "),
        ).includes(normalize(search)),
    ),
  );
  $effect(() => {
    if (offset >= results.length) offset = 0;
  });
</script>

<section class="admin-panel admin-stack confirmed-intro">
  <h2>Doublons évités</h2>
  <p>
    Ces demandes Onagre ont été reconnues dans des dossiers DN existants. Le rapprochement permet de
    conserver le dossier DN au lieu d’en créer une copie.
  </p>
  <div class="counts" aria-label="Bilan des doublons évités">
    <span><strong>{links.length}</strong> demandes reliées sans copie</span>
    <span><strong>{projects}</strong> projets Onagre</span>
    <span><strong>{dossiers}</strong> dossiers DN conservés</span>
  </div>
  <p>
    Plusieurs demandes peuvent être reliées au même DN. Aucun dossier DN n’a été supprimé ou
    fusionné lors du rapprochement ; {related} entrées secondaires documentées ont aussi été conservées.
  </p>
  <p>
    <strong>Confirmé ne veut pas toujours dire facile.</strong> Un code complet facilite certains rapprochements.
    D’autres ont nécessité de comparer des dates, de lire l’historique ou un acte original. Chaque ligne
    explique les éléments décisifs et les différences conservées.
  </p>
  <div class="filters">
    <label
      >Rechercher un projet, une demande, un DN ou un lieu
      <input class="fr-input" type="search" bind:value={search} oninput={() => (offset = 0)} />
    </label>
    <label for="confirmation-profile">Ce qui a permis la confirmation</label>
    <select
      id="confirmation-profile"
      class="fr-select"
      bind:value={profile}
      onchange={() => (offset = 0)}
    >
      <option value="">Tous les types de preuve</option>
      {#each Object.entries(confirmationLabels) as [value, label]}
        <option {value}>{label} ({links.filter((link) => link.profile === value).length})</option>
      {/each}
    </select>
  </div>
</section>
<p role="status">{results.length} correspondance{results.length > 1 ? "s" : ""} dans la liste</p>
{#each results.slice(offset, offset + size) as link (link.demandeKey)}
  <ConfirmedMatch {link} />
{:else}
  <p class="admin-panel">
    {links.length
      ? "Aucune correspondance pour ces filtres."
      : "Aucun rapprochement confirmé n’a été chargé dans cet environnement."}
  </p>
{/each}
{#if results.length > size}
  <nav class="pagination" aria-label="Pages des doublons évités">
    <button
      class="fr-btn fr-btn--tertiary fr-btn--sm"
      disabled={offset === 0}
      onclick={() => (offset -= size)}>Précédents</button
    >
    <span>{Math.floor(offset / size) + 1} / {Math.ceil(results.length / size)}</span>
    <button
      class="fr-btn fr-btn--tertiary fr-btn--sm"
      disabled={offset + size >= results.length}
      onclick={() => (offset += size)}>Suivants</button
    >
  </nav>
{/if}

<style>
  .counts,
  .pagination {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: center;
  }
  .counts span {
    padding: 0.75rem;
    background: var(--background-alt-grey);
    border-radius: 0.4rem;
  }
  .counts strong {
    font-size: 1.25rem;
  }
  .filters {
    display: grid;
    gap: 0.5rem;
  }
  .pagination {
    justify-content: center;
  }
</style>
