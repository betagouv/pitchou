<script lang="ts">
  import type { DossierFollowerCandidate } from "@pitchou/types/capabilities.ts";
  type Props = {
    dossierId: number;
    followers: DossierFollowerCandidate[];
    saving: boolean;
    removeFollower: (email: string) => void;
  };
  let { dossierId, followers, saving, removeFollower }: Props = $props();
</script>

<section
  class="flex min-h-0 flex-1 flex-col"
  aria-labelledby={`current-followers-title-${dossierId}`}
>
  <h3
    id={`current-followers-title-${dossierId}`}
    class="fr-h5 flex flex-none items-center gap-2 fr-mb-1w"
  >
    <span
      class="fr-icon-user-fill fr-icon--sm text-[color:var(--text-action-high-blue-france)]"
      aria-hidden="true"
    ></span>
    Instructeur·ice(s) suivant le dossier
  </h3>
  {#if followers.length === 0}
    <p class="fr-text--sm fr-mb-0 text-[color:var(--text-mention-grey)]">
      Personne ne suit ce dossier pour l’instant.
    </p>
  {:else}
    <ul
      class="min-h-0 list-none overflow-y-auto border border-[color:var(--border-default-grey)] fr-m-0 fr-p-0"
      aria-live="polite"
    >
      {#each followers as follower (follower.email)}
        <li
          class="flex items-center justify-between gap-4 border-b border-[color:var(--border-default-grey)] fr-py-1w fr-px-2w last:border-b-0"
        >
          <span class="min-w-0 [overflow-wrap:anywhere]">{follower.email}</span>
          <button
            type="button"
            class="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line flex-none"
            aria-label={`Retirer ${follower.email} des personnes qui suivent le dossier`}
            title={`Retirer ${follower.email}`}
            disabled={saving}
            onclick={() => removeFollower(follower.email)}
          ></button>
        </li>
      {/each}
    </ul>
  {/if}
</section>
