<script lang="ts">
  import { goto } from "$app/navigation";
  import { logout } from "$lib/shared/main.ts";
  import UiHeader from "@pitchou/ui/Header.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import CompactHeader from "./CompactHeader.svelte";

  type Props = {
    nav?: boolean;
    email?: string | undefined;
  };

  let { nav = true, email = undefined }: Props = $props();

  function logoutAndRedirect() {
    // Send straight to the sign-in page: the route guards only run on load, so
    // redirecting through "/" would land back on the current (now empty) page.
    logout().then(() => goto("/connexion"));
  }
</script>

{#if nav && email}
  <!-- Internal pages: the compact banner replaces the official DSFR header. -->
  <CompactHeader {email} onLogout={logoutAndRedirect} />
{:else}
  <UiHeader
    serviceTitle="Pitchou"
    serviceTagline="Demandes de Dérogation Espèces Protégées"
    tools={email ? tools : undefined}
    menuLinks={email ? menuLinks : undefined}
    nav={undefined}
  />
{/if}

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
