<script lang="ts">
  import { goto } from "$app/navigation";
  import { logout } from "$lib/shared/main.ts";
  import { store } from "$lib/state/store.svelte.ts";
  import UiHeader from "@pitchou/ui/Header.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";
  import type { AccountMenuLink } from "@pitchou/ui";

  import Navbar from "./Navbar.svelte";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
  };

  let { nav = true, email = undefined }: Props = $props();

  // Admin sections shown in the account menu, only for administrators.
  const adminLinks = $derived<AccountMenuLink[]>(
    store.identité?.estAdmin
      ? [
          { href: "/admin/utilisateurs", label: "Admin - Utilisateurs", icon: "fr-icon-team-line" },
          {
            href: "/admin/especes-protegees",
            label: "Admin - Espèces",
            icon: "fr-icon-seedling-line",
          },
        ]
      : [],
  );

  function logoutAndRedirect() {
    logout().then(() => goto("/"));
  }
</script>

<UiHeader
  serviceTitle="Pitchou"
  serviceTagline="Demandes de Dérogation Espèces Protégées"
  tools={email ? tools : undefined}
  menuLinks={email ? menuLinks : undefined}
  nav={nav ? navLinks : undefined}
/>

{#snippet tools()}
  {#if email}
    <AccountMenu {email} onLogout={logoutAndRedirect} links={adminLinks} />
  {/if}
{/snippet}

{#snippet menuLinks()}
  {#if email}
    <AccountMenu {email} onLogout={logoutAndRedirect} align="start" links={adminLinks} />
  {/if}
{/snippet}

{#snippet navLinks()}
  <Navbar />
{/snippet}
