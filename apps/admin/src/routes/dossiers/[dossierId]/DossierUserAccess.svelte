<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "./$types";
  let {
    dossierId,
    initial,
    onChanged,
  }: {
    dossierId: number;
    initial: PageData["userAccess"];
    onChanged: () => Promise<void>;
  } = $props();
  let access = $state<PageData["userAccess"]>({ grants: [], users: [] });
  $effect(() => {
    access = initial;
  });
  let selected = $state("");
  let level = $state<AccessLevel>("read");
  let saving = $state(false);
  let message = $state("");
  const available = $derived(
    access.users.filter((user) => !access.grants.some((grant) => grant.user_id === user.id)),
  );
  const effectiveLabels: Record<string, string> = {
    complet: "Instruction",
    lecture_complete: "Lecture complète",
    lecture: "Lecture restreinte",
  };
  async function save(userId: number, accessLevel: AccessLevel | null) {
    saving = true;
    message = "";
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/acces-utilisateurs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, accessLevel }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Modification d'accès impossible");
      access = result;
      selected = "";
      await onChanged();
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Modification d'accès impossible";
    } finally {
      saving = false;
    }
  }
</script>

<section class="admin-panel p-4" aria-label="Accès individuels au dossier">
  <h2>Accès individuels au dossier</h2>
  <p>
    Ces accès sont accordés directement à une personne, indépendamment de ses groupes. Le niveau le
    plus fort s'applique, dans la limite des permissions du compte. La lecture complète donne accès
    à toutes les informations internes sans modification.
  </p>
  <p>Le suivi personnel ne donne aucun accès et ne désigne aucun responsable.</p>
  {#if message}<p class="fr-alert fr-alert--error" role="alert">{message}</p>{/if}
  <fieldset disabled={saving}>
    {#each access.grants as grant (grant.user_id)}
      <div class="mb-4 rounded-lg border border-[var(--border-default-grey)] p-3">
        <h3 class="text-base">
          {grant.email ?? `Compte ${grant.user_id}`}{grant.active ? "" : " · Inactif"}
        </h3>
        <p>
          Origine : accès individuel manuel · {grant.access_level === "read"
            ? "Lecture complète"
            : "Instruction"}
        </p>
        <p>
          Accès effectif, tous groupes et permissions compris : {effectiveLabels[
            grant.effective_access ?? ""
          ] ?? "Aucun accès"}
        </p>
        {#if can("groups:manage")}
          <label class="fr-label" for={`user-access-${grant.user_id}`}
            >Niveau d'accès de {grant.email ?? `Compte ${grant.user_id}`}</label
          >
          <select
            class="fr-select"
            id={`user-access-${grant.user_id}`}
            value={grant.access_level}
            onchange={(event) => save(grant.user_id, event.currentTarget.value as AccessLevel)}
          >
            <option value="read">Lecture complète</option><option value="instruct"
              >Instruction</option
            >
          </select>
          <button
            type="button"
            class="fr-btn fr-btn--tertiary fr-btn--sm mt-2"
            onclick={() => save(grant.user_id, null)}
            >Révoquer l'accès individuel de {grant.email ?? `Compte ${grant.user_id}`}</button
          >
        {/if}
      </div>
    {:else}<p>Aucun accès individuel.</p>{/each}
    {#if can("groups:manage") && available.length}
      <label class="fr-label" for="new-user-access">Accorder un accès individuel</label>
      <select class="fr-select" id="new-user-access" bind:value={selected}>
        <option value="">Choisir une personne</option>
        {#each available as user}<option value={user.id}
            >{user.email ?? `Compte ${user.id}`}{user.active ? "" : " · Inactif"}</option
          >{/each}
      </select>
      <label class="fr-label mt-2" for="new-user-access-level">Niveau d'accès individuel</label>
      <select class="fr-select" id="new-user-access-level" bind:value={level}>
        <option value="read">Lecture complète</option><option value="instruct">Instruction</option>
      </select>
      <button
        class="fr-btn fr-btn--secondary mt-2"
        type="button"
        disabled={!selected}
        onclick={() => save(Number(selected), level)}>Accorder l'accès</button
      >
    {/if}
  </fieldset>
  {#if saving}<p role="status">Enregistrement…</p>{/if}
</section>
