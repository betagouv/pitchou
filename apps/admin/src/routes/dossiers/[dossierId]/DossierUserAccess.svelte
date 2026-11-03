<script lang="ts">
  import { can } from "#lib/access.svelte.ts";
  import type { AccessLevel } from "@pitchou/types/groupRouting.ts";
  import type { PageData } from "./$types";
  import SearchableSelect from "../SearchableSelect.svelte";
  import AccessLevelChoice from "./DossierAccess/AccessLevelChoice.svelte";
  import UserAccessRow from "./DossierUserAccess/UserAccessRow.svelte";

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
  let adding = $state(false);
  let selected = $state("");
  let level = $state<AccessLevel>("read");
  let saving = $state(false);
  let message = $state("");
  const available = $derived(
    access.users.filter((user) => !access.grants.some((grant) => grant.user_id === user.id)),
  );
  const options = $derived(
    available.map((user) => ({
      value: String(user.id),
      label: `${user.email ?? `Compte ${user.id}`}${user.active ? "" : " · Inactif"}`,
    })),
  );
  const selectedUser = $derived(available.find((user) => String(user.id) === selected));

  async function save(userId: number, accessLevel: AccessLevel | null) {
    if (!can("groups:manage") || saving) return;
    saving = true;
    try {
      const response = await fetch(`/api/dossiers/${dossierId}/acces-utilisateurs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ userId, accessLevel }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message ?? "Modification d'accès impossible");
      access = result;
      await onChanged();
    } finally {
      saving = false;
    }
  }
  function closeAdd() {
    adding = false;
    selected = "";
    level = "read";
    message = "";
  }
  async function add() {
    if (!selectedUser || saving || !can("groups:manage")) return;
    message = "";
    try {
      await save(selectedUser.id, level);
      closeAdd();
    } catch (cause) {
      message = cause instanceof Error ? cause.message : "Ajout de l'accès impossible";
    }
  }
</script>

<section class="access-section" aria-label="Accès individuels au dossier">
  <div class="access-section-header">
    <h2>Personnes</h2>
    {#if can("groups:manage") && !adding && available.length}
      <button
        type="button"
        class="fr-btn fr-btn--secondary fr-btn--sm"
        disabled={saving}
        onclick={() => {
          adding = true;
        }}>Ajouter une personne</button
      >
    {/if}
  </div>
  <p class="access-description">
    Accordez un accès direct à une personne, sans l'ajouter à un groupe.
  </p>
  {#if can("groups:manage") && adding}
    <form
      class="access-editor"
      aria-label="Ajouter un accès individuel"
      onsubmit={(event) => {
        event.preventDefault();
        void add();
      }}
    >
      <fieldset disabled={saving}>
        <legend>Ajouter une personne</legend>
        <label class="fr-label" id="new-user-access-label" for="new-user-access">Personne</label>
        <SearchableSelect
          id="new-user-access"
          labelledBy="new-user-access-label"
          {options}
          value={selected}
          onChange={(value) => {
            selected = value;
          }}
          required
          disabled={saving}
        />
        {#if selectedUser && !selectedUser.active}
          <p class="access-meta" role="status">
            Ce compte est inactif. Il ne pourra pas accéder au dossier tant qu'il ne sera pas
            réactivé.
          </p>
        {/if}
        <AccessLevelChoice
          name="new-user-access-level"
          label="Niveau d'accès individuel"
          bind:value={level}
          disabled={saving}
        />
        {#if message}<p class="fr-alert fr-alert--error" role="alert">{message}</p>{/if}
        <div class="access-actions">
          <button class="fr-btn fr-btn--sm" type="submit" disabled={!selectedUser}
            >Accorder l'accès</button
          >
          <button class="fr-btn fr-btn--tertiary fr-btn--sm" type="button" onclick={closeAdd}
            >Annuler</button
          >
        </div>
      </fieldset>
    </form>
  {/if}
  <div class="access-list">
    {#each access.grants as grant (grant.user_id)}
      <UserAccessRow {grant} disabled={saving} onSave={save} />
    {:else}
      <p class="access-empty">Aucun accès individuel.</p>
    {/each}
  </div>
  {#if saving}<p class="access-meta" role="status">Enregistrement…</p>{/if}
</section>
