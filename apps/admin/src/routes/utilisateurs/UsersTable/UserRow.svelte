<script lang="ts">
  import { profileLabel, userName, type User } from "../model.ts";
  let { user, onSelect }: { user: User; onSelect: (id: number) => void } = $props();
  const name = $derived(userName(user));
  const groups = $derived(user.groupes.filter((group) => group.active));
</script>

<tr
  role="button"
  tabindex="0"
  aria-label={`Modifier ${user.email ?? name}`}
  onclick={() => onSelect(user.id)}
  onkeydown={(event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect(user.id);
    }
  }}
>
  <th scope="row">
    <div class="account">
      <span class="avatar" aria-hidden="true">{name.slice(0, 2).toUpperCase()}</span>
      <div class="identity">
        <span class="account-name">{name}</span>{#if name !== user.email && user.email}<span
            class="email">{user.email}</span
          >{/if}
      </div>
      <span class="row-arrow fr-icon-arrow-right-s-line fr-icon--sm" aria-hidden="true"></span>
    </div>
  </th>
  <td>
    {#if groups.length}<div class="tags">
        {#each groups.slice(0, 3) as group}<span class="tag">{group.name}</span
          >{/each}{#if groups.length > 3}<span
            class="tag"
            title={groups
              .slice(3)
              .map((group) => group.name)
              .join(", ")}>+{groups.length - 3}</span
          >{/if}
      </div>
    {:else}<span class="muted">Aucun groupe</span>{/if}
  </td>
  <td>
    <div class="tags">
      {#each user.bundles as bundle}<span class="tag profile">{profileLabel(bundle)}</span
        >{:else}<span class="muted">Aucun profil</span>{/each}
    </div>
    {#if user.grants.length || user.exclusions.length}<span class="custom-rights"
        >Droits personnalisés</span
      >{/if}
  </td>
  <td class="muted"
    >{#if user.last_login_at}<time
        datetime={new Date(user.last_login_at).toISOString()}
        title={new Date(user.last_login_at).toLocaleString("fr-FR")}
        >{new Date(user.last_login_at).toLocaleDateString("fr-FR")}</time
      >{:else}Jamais connecté{/if}</td
  >
</tr>
