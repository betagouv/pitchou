<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { Snippet } from "svelte";
  import { formatDateAbsolute } from "$lib/dossier/displayDossier.ts";
  import CardDossier from "./CardDossier.svelte";
  import { groupDossiersByDepotMonth } from "./sections.ts";
  import { ROW_GRID, TILE_GRID } from "./rowLayout.ts";

  type Props = {
    dossiers: DossierSummary[];
    wholeListEmpty: boolean;
    followedIds: Set<Dossier["id"]>;
    notificationViewed: (id: Dossier["id"]) => boolean;
    follow: (id: Dossier["id"]) => Promise<void>;
    leave: (id: Dossier["id"]) => Promise<void>;
    emptyListMessage?: Snippet<[{ wholeListEmpty: boolean }]>;
  };
  let {
    dossiers,
    wholeListEmpty,
    followedIds,
    notificationViewed,
    follow,
    leave,
    emptyListMessage,
  }: Props = $props();

  const sections = $derived(groupDossiersByDepotMonth(dossiers));

  const columnLabel = "fr-text--xs fr-mb-0 uppercase text-[color:var(--text-mention-grey)]";
</script>

{#if dossiers.length >= 1}
  <div class="fr-mb-2w fr-py-2w">
    {#each sections as section (section.key)}
      <section class="[&:not(:first-child)]:mt-16">
        <h3 class="fr-h6 fr-mb-1w">{section.title}</h3>

        <!-- Column names, repeated for each section. They label the tiles visually; screen
             readers get the equivalent labels inside each tile instead. -->
        <div class="{ROW_GRID} fr-mb-1v hidden lg:grid" aria-hidden="true">
          <span></span>
          <div class="{TILE_GRID} fr-px-2w">
            <span class="{columnLabel} lg:col-span-3">Nom du projet</span>
            <span class={columnLabel}>Pétitionnaire, localisation</span>
            <span class={columnLabel}>Avancement du dossier</span>
            <span class={columnLabel}>Prochaine action</span>
            <span class={columnLabel}>Alertes</span>
            <span></span>
          </div>
        </div>

        <ul class="list-none fr-p-0 fr-m-0">
          {#each section.dossiers as dossier (dossier.id)}
            <li class="{ROW_GRID} [&:not(:last-child)]:fr-mb-1w">
              {#if dossier.depot_date}
                <time
                  datetime={formatDateAbsolute(dossier.depot_date, "yyyy-MM-dd")}
                  class="flex flex-col items-center justify-center leading-none"
                >
                  <span class="fr-sr-only">Déposé le</span>
                  <span class="text-[1.25rem] font-bold text-[color:var(--text-title-grey)]">
                    {formatDateAbsolute(dossier.depot_date, "dd")}
                  </span>
                  <span class="fr-text--xs fr-mb-0 text-[color:var(--text-mention-grey)]">
                    {formatDateAbsolute(dossier.depot_date, "MMM")}
                  </span>
                </time>
              {:else}
                <span></span>
              {/if}
              <CardDossier
                {dossier}
                currentInstructeurFollowsDossier={follow}
                currentInstructeurLeavesDossier={leave}
                dossierFollowedByCurrentInstructeur={followedIds.has(dossier.id)}
                notificationViewed={notificationViewed(dossier.id)}
              />
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
{:else if emptyListMessage}
  {@render emptyListMessage({ wholeListEmpty })}
{:else}
  <p>Aucun dossier n'a été trouvé.</p>
{/if}
