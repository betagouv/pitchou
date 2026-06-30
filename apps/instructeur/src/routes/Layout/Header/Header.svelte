<script lang="ts">
  import { goto } from "$app/navigation";
  import { logout } from "$lib/shared/main.ts";
  import UiHeader from "@pitchou/ui/Header.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import Navbar from "./Navbar.svelte";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
  };

  let { nav = true, email = undefined }: Props = $props();

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
    <AccountMenu {email} onLogout={logoutAndRedirect} />
  {/if}
{/snippet}

{#snippet menuLinks()}
  {#if email}
    <AccountMenu {email} onLogout={logoutAndRedirect} align="start" />
  {/if}
{/snippet}

{#snippet navLinks()}
  <Navbar />
{/snippet}
