<script lang="ts">
  import { departementName } from "@pitchou/common/departements.ts";
  import type { PageData } from "./$types";

  let { dossiers }: { dossiers: PageData["unmatched"] } = $props();
</script>

<aside
  id="unmatched-dossiers"
  aria-labelledby="unmatched-dossiers-title"
  class="overflow-hidden rounded-xl border border-[var(--border-default-grey)] border-l-4 border-l-[var(--border-plain-warning)]"
>
  <div class="flex items-center gap-3 bg-[var(--background-alt-grey)] px-4 py-3">
    <span
      class="fr-icon-warning-line shrink-0 text-[var(--text-default-warning)]"
      aria-hidden="true"
    ></span>
    <div>
      <h2 id="unmatched-dossiers-title" class="m-0 text-base font-semibold">
        {dossiers.length}
        {dossiers.length === 1 ? "dossier sans groupe" : "dossiers sans groupe"}
      </h2>
      <p class="m-0 mt-1 text-sm text-[var(--text-mention-grey)]">
        Un département principal et un groupe actif couvrant ce département sont nécessaires pour
        affecter ces dossiers.
      </p>
    </div>
  </div>
  <div class="relative overflow-x-auto">
    <table class="w-full border-collapse text-sm">
      <caption class="sr-only">Dossiers sans groupe et informations à compléter</caption>
      <thead class="text-left text-[var(--text-mention-grey)]">
        <tr>
          <th scope="col" class="px-4 py-2 font-medium">Dossier</th>
          <th scope="col" class="px-4 py-2 font-medium">À compléter</th>
          <th scope="col" class="w-12 px-4 py-2"><span class="sr-only">Ouvrir</span></th>
        </tr>
      </thead>
      <tbody>
        {#each dossiers as dossier (dossier.id)}
          <tr class="border-t border-[var(--border-default-grey)]">
            <th scope="row" class="px-4 py-3 text-left font-normal">
              <a class="fr-link" href={`/dossiers/${dossier.id}`}>
                {dossier.name || `Dossier ${dossier.id}`}
              </a>
            </th>
            <td class="px-4 py-3">
              {#if dossier.primary_department}
                <span class="block">Aucun groupe actif</span>
                <span class="text-[var(--text-mention-grey)]">
                  {dossier.primary_department} · {departementName(dossier.primary_department)}
                </span>
              {:else}
                Département principal manquant
              {/if}
            </td>
            <td class="px-4 py-3">
              <a
                class="fr-btn fr-btn--tertiary-no-outline fr-icon-arrow-right-line"
                href={`/dossiers/${dossier.id}`}
                title={`Ouvrir ${dossier.name || `le dossier ${dossier.id}`}`}
                aria-label={`Ouvrir ${dossier.name || `le dossier ${dossier.id}`}`}
              ></a>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</aside>
