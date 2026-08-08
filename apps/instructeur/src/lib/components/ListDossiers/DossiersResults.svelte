<script lang="ts">
  import type { DossierSummary } from "@pitchou/types/API_Pitchou.ts";
  import type Dossier from "@pitchou/types/database/public/Dossier.ts";
  import type { Snippet } from "svelte";
  import CardDossier from "./CardDossier.svelte";

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
</script>

{#if dossiers.length >= 1}
  <div class="bg-[var(--background-contrast-grey)] fr-mb-2w fr-py-4w fr-px-4w fr-px-md-15w">
    <ul class="list-none fr-p-0 fr-m-0">
      {#each dossiers as dossier (dossier.id)}
        <li class="[&:not(:last-child)]:mb-4">
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
  </div>
{:else if emptyListMessage}
  {@render emptyListMessage({ wholeListEmpty })}
{:else}
  <p>Aucun dossier n'a été trouvé.</p>
{/if}
