<script lang="ts">
  import type { UtilisateurAARRI } from "$types/API_Pitchou.ts";
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
  <div class="fr-table fr-table--bordered fr-table--layout-fixed">
    <table>
      <colgroup>
        <col />
        <col style="width: 9rem" />
        <col style="width: 7rem" />
        <col style="width: 10rem" />
      </colgroup>
      <thead>
        <tr>
          <th scope="col">Email</th>
          <th scope="col">Niveau AARRI</th>
          <th scope="col">Actions</th>
          <th scope="col">Dernière activité</th>
        </tr>
      </thead>
      <tbody>
        {#each utilisateurs as utilisateur (utilisateur.personneId)}
          <tr>
            <td>{utilisateur.email ?? "—"}</td>
            <td><BadgeNiveauAARRI niveau={utilisateur.niveau} /></td>
            <td>{utilisateur.actionCount}</td>
            <td>{formatDate(utilisateur.lastActivityDate)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p>Aucune utilisateurice n'a été trouvée.</p>
{/if}

<style lang="scss">
  // Below ~768px the table keeps its min-width and the container scrolls horizontally
  .fr-table {
    overflow-x: auto;
  }

  .fr-table table {
    width: 100%;
    min-width: 48rem;
  }
</style>
