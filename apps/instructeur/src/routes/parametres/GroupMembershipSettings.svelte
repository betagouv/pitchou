<script lang="ts">
  import { onMount } from "svelte";
  import type { MembershipGroup } from "@pitchou/types/groupMembership.ts";
  import type { UserId } from "@pitchou/types/permissions.ts";
  import GroupMembers from "./GroupMembers.svelte";

  let { userId }: { userId: UserId } = $props();
  let groups = $state<MembershipGroup[]>([]);
  let loading = $state(true);
  let failure = $state("");

  async function load() {
    loading = true;
    failure = "";
    try {
      const response = await fetch("/parametres/groupes", {
        headers: { accept: "application/json" },
      });
      if (!response.ok) throw new Error("Impossible de charger vos groupes. Réessayez.");
      groups = await response.json();
    } catch (cause) {
      failure = cause instanceof Error ? cause.message : "Impossible de charger vos groupes.";
    } finally {
      loading = false;
    }
  }
  onMount(load);
</script>

<div class="flex flex-col gap-6">
  <p class="m-0! text-sm text-[var(--text-mention-grey)]">
    Chaque membre peut ajouter ou retirer des collègues dans son groupe. Les départements et l'état
    du groupe restent gérés par les administrateurs.
  </p>
  {#if loading}
    <p role="status" class="m-0 p-6">Chargement des groupes…</p>
  {:else if failure}
    <div class="p-6">
      <p role="alert" class="fr-error-text">{failure}</p>
      <button class="fr-btn fr-btn--secondary" onclick={load}>Réessayer</button>
    </div>
  {:else if groups.length === 0}
    <div class="p-6 md:p-8">
      <h3 class="fr-h6 fr-mb-1w">Vous n'appartenez à aucun groupe actif</h3>
      <p class="fr-mb-0">
        Un collègue déjà membre peut vous ajouter avec votre adresse professionnelle. Pour créer un
        groupe ou rétablir l'accès à un groupe sans membre, contactez un administrateur Pitchou.
      </p>
    </div>
  {:else}
    {#each groups as group (group.id)}
      <GroupMembers
        {group}
        {userId}
        onChanged={async () => {
          const response = await fetch("/parametres/groupes", {
            headers: { accept: "application/json" },
          });
          if (!response.ok)
            throw new Error(
              "La modification est enregistrée, mais la liste n'a pas pu être actualisée. Rechargez la page.",
            );
          groups = await response.json();
        }}
      />
    {/each}
  {/if}
</div>
