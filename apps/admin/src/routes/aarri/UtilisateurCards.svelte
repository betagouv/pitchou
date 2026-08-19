<script lang="ts">
  import type { UtilisateurAARRI } from "@pitchou/types/API_Pitchou.ts";
  import BadgeNiveauAARRI from "./BadgeNiveauAARRI.svelte";

  type Props = {
    utilisateurs: UtilisateurAARRI[];
  };

  let { utilisateurs }: Props = $props();

  function formatDate(iso: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }
</script>

{#if utilisateurs.length >= 1}
  <ul class="mx-0 mt-2 mb-0 flex list-none flex-col gap-2 p-0">
    {#each utilisateurs as utilisateur (utilisateur.personneId)}
      <li class="rounded-lg border border-solid border-gray-200 bg-white p-4 shadow-sm">
        <div class="flex flex-wrap items-center gap-3">
          <span class="font-semibold">{utilisateur.email ?? "—"}</span>
          <BadgeNiveauAARRI niveau={utilisateur.niveau} />
        </div>
        {#if utilisateur.groupesInstructeurs.length >= 1}
          <ul class="fr-m-0 fr-p-0 mt-2 flex list-none flex-wrap gap-1">
            {#each utilisateur.groupesInstructeurs as groupe}
              <li class="fr-m-0 fr-p-0"><p class="fr-tag fr-tag--sm">{groupe}</p></li>
            {/each}
          </ul>
        {/if}
        <p class="fr-mb-0 mt-2 text-sm text-gray-500">
          {utilisateur.actionCount} action{utilisateur.actionCount > 1 ? "s" : ""} · Dernière activité
          le {formatDate(utilisateur.lastActivityDate)}
        </p>
      </li>
    {/each}
  </ul>
{:else}
  <p>Aucune utilisateurice n'a été trouvée.</p>
{/if}
