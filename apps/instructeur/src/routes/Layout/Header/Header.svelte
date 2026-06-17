<script lang="ts">
  import { goto } from "$app/navigation";
  import { env } from "$env/dynamic/public";
  import { logout } from "$lib/shared/main.ts";
  import UiHeader from "@pitchou/ui/Header.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import Navbar from "./Navbar.svelte";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
  };

  let { nav = true, email = undefined }: Props = $props();

  // Link to the admin app, shown in the account menu. Hidden when unset.
  const adminUrl = env.PUBLIC_SITE_URL_ADMIN;

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
    <AccountMenu {email} onLogout={logoutAndRedirect} {adminUrl} />
  {/if}
{/snippet}

{#snippet menuLinks()}
  {#if email}
    <AccountMenu {email} onLogout={logoutAndRedirect} align="start" {adminUrl} />
  {/if}
{/snippet}

{#snippet navLinks()}
  <Navbar />
{/snippet}
