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
      <!-- One row on wide screens: identity | groupes | activity. Wraps on narrow screens. -->
      <li
        class="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-lg border border-solid border-[color:var(--border-default-grey)] bg-[var(--background-default-grey)] px-4 py-3 shadow-sm"
      >
        <div class="flex w-96 min-w-0 shrink-0 items-center gap-3">
          <!-- Fixed slot so the badges form an aligned column, like the levels legend. -->
          <span class="w-24 shrink-0">
            <BadgeNiveauAARRI niveau={utilisateur.niveau} />
          </span>
          <span class="min-w-0 truncate font-semibold" title={utilisateur.email ?? undefined}>
            {utilisateur.email ?? "—"}
          </span>
        </div>
        {#if utilisateur.groupesInstructeurs.length >= 1}
          <ul class="fr-m-0 fr-p-0 flex min-w-48 grow list-none flex-wrap gap-1">
            {#each utilisateur.groupesInstructeurs as groupe}
              <li class="fr-m-0 fr-p-0"><p class="fr-tag fr-tag--sm">{groupe}</p></li>
            {/each}
          </ul>
        {/if}
        <p
          class="fr-mb-0 ml-auto shrink-0 text-right text-sm text-[color:var(--text-mention-grey)]"
        >
          {utilisateur.actionCount} action{utilisateur.actionCount > 1 ? "s" : ""} · Dernière activité
          le {formatDate(utilisateur.lastActivityDate)}
        </p>
      </li>
    {/each}
  </ul>
{:else}
  <p>Aucune utilisateurice n'a été trouvée.</p>
{/if}
