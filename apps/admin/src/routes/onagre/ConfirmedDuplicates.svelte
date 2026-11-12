<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { onDestroy } from "svelte";
  import Pagination from "#lib/components/Pagination.svelte";
  import {
    confirmationLabels,
    type ConfirmedDuplicate,
  } from "@pitchou/types/onagreConfirmedDuplicates.ts";
  import ConfirmedMatch from "./ConfirmedDuplicates/ConfirmedMatch.svelte";
  import "./duplicateLists.css";
  let { links }: { links: ConfirmedDuplicate[] } = $props();
  let input = $state("");
  let search = $state("");
  let profile = $state("");
  let current = $state(1);
  let selected = $state<ConfirmedDuplicate | null>(null);
  let timer: ReturnType<typeof setTimeout>;
  const size = 20;
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replaceAll(/\p{Diacritic}/gu, "")
      .toLowerCase();
  function scheduleSearch() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      search = input;
      current = 1;
    }, 350);
  }
  onDestroy(() => clearTimeout(timer));
  const projects = $derived(new Set(links.map((link) => link.projectId)).size);
  const dossiers = $derived(new Set(links.map((link) => link.target.id)).size);
  const results = $derived(
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
  const pages = $derived(Math.max(1, Math.ceil(results.length / size)));
  $effect(() => {
    if (current > pages) current = 1;
  });
</script>

<section class="admin-stack duplicate-list" aria-label="Doublons évités">
  <p>
    {links.length} demandes reliées · {projects} projets Onagre · {dossiers} dossiers DN conservés
  </p>
  <div class="filters">
    <label
      >Rechercher un projet, une demande ou un lieu<input
        class="fr-input"
        type="search"
        bind:value={input}
        oninput={scheduleSearch}
      /></label
    >
    <div class="onagre-field">
      <label for="confirmation-profile">Ce qui a permis la confirmation</label>
      <Select
        id="confirmation-profile"
        bind:value={profile}
        onChange={() => (current = 1)}
        options={[
          { value: "", label: "Tous les types de preuve" },
          ...Object.entries(confirmationLabels).map(([value, label]) => ({
            value,
            label: `${label} (${links.filter((link) => link.profile === value).length})`,
          })),
        ]}
      />
    </div>
  </div>
  <div class="list-controls">
    <p role="status">{results.length} correspondance{results.length > 1 ? "s" : ""}</p>
    <Pagination
      {current}
      total={pages}
      label="Pages des doublons évités"
      onChange={(value) => (current = value)}
    />
  </div>
  <div class="onagre-table-scroll">
    <table>
      <thead
        ><tr><th>Demande Onagre</th><th>Dossier DN conservé</th><th>Confirmation</th></tr></thead
      >
      <tbody>
        {#each results.slice((current - 1) * size, current * size) as link (link.demandeKey)}
          <tr class="duplicate-row handled">
            <td class="name"
              ><button class="row-button" onclick={() => (selected = link)}>
                <span class="fr-icon-checkbox-circle-line" aria-hidden="true"
                ></span>{link.projectName}<span class="fr-sr-only"> — Doublon évité</span>
              </button><span class="reference"
                >Projet {link.projectId} · Demande {link.source.reference || link.source.id}</span
              ></td
            >
            <td>{link.target.name}<span class="reference">DN {link.target.id}</span></td>
            <td>{confirmationLabels[link.profile]}</td>
          </tr>
        {:else}<tr
            ><td colspan="3"
              >{links.length
                ? "Aucune correspondance pour ces filtres."
                : "Aucun rapprochement confirmé chargé."}</td
            ></tr
          >{/each}
      </tbody>
    </table>
  </div>
</section>
{#if selected}
  <ConfirmedMatch link={selected} onClose={() => (selected = null)} />
{/if}
