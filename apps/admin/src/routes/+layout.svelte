<script lang="ts">
  import "../app.css";

  import { afterNavigate } from "$app/navigation";

  import UiHeader from "@pitchou/ui/Header.svelte";
  import UiFooter from "@pitchou/ui/Footer.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import AdminHeader from "./Layout/Header.svelte";
  import Sidebar from "./Layout/Sidebar.svelte";

  import type { LayoutData } from "./$types";

  let { children, data }: { children: import("svelte").Snippet; data: LayoutData } = $props();

  let sidebarOpen = $state(false);

  // Close the mobile sidebar when a link inside it navigates.
  afterNavigate(() => {
    sidebarOpen = false;
  });

  function logout() {
    window.location.href = "/auth/logout";
  }
</script>

<svelte:head>
  <title>Pitchou — Admin</title>
</svelte:head>

{#if data.isAdmin}
  <!-- Logged-in admins get the internal-tool shell: sidebar + topbar, no DSFR chrome. -->
  <div class="flex h-screen overflow-hidden">
    <Sidebar
      open={sidebarOpen}
      onClose={() => (sidebarOpen = false)}
      email={data.user?.email}
      onLogout={logout}
    />

    <div class="flex min-w-0 flex-1 flex-col overflow-y-auto">
      <AdminHeader onMenuClick={() => (sidebarOpen = true)} />

      <!-- Full-width content with slim padding, like the rest of the shell. -->
      <main tabindex="-1" id="main" class="flex flex-1 flex-col p-2">
        {@render children()}
      </main>
    </div>
  </div>
{:else}
  <!-- Logged-out (or non-admin) screens keep the standard DSFR layout. -->
  <UiHeader
    serviceTitle="Pitchou"
    serviceTagline="Administration"
    tools={data.user ? tools : undefined}
    menuLinks={data.user ? menuLinks : undefined}
  />

  <main tabindex="-1" id="main">
    <div class="fr-container fr-py-6w">
      {@render children()}
    </div>
  </main>

  <UiFooter description="Administration de Pitchou." />
{/if}

{#snippet tools()}
  <AccountMenu email={data.user?.email} onLogout={logout} />
{/snippet}

{#snippet menuLinks()}
  <AccountMenu align="start" email={data.user?.email} onLogout={logout} />
{/snippet}
