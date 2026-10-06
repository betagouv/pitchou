<script lang="ts">
  import "../app.css";

  import { afterNavigate } from "$app/navigation";

  import UiHeader from "@pitchou/ui/Header.svelte";
  import UiFooter from "@pitchou/ui/Footer.svelte";
  import AccountMenu from "@pitchou/ui/AccountMenu.svelte";

  import AdminHeader from "./Layout/Header.svelte";
  import Sidebar from "./Layout/Sidebar.svelte";
  import { uploadLimit } from "$lib/upload/uploadLimit.svelte.ts";

  import type { LayoutData } from "./$types";

  let { children, data }: { children: import("svelte").Snippet; data: LayoutData } = $props();

  // File pickers read the limit from here; the server owns the value.
  $effect(() => {
    uploadLimit.maxBytes = data.maxUploadSizeBytes;
  });

  let sidebarOpen = $state(false);
  let sidebarCollapsed = $state(false);

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
  <div class="admin-ui relative flex h-dvh overflow-hidden">
    <Sidebar
      open={sidebarOpen}
      collapsed={sidebarCollapsed}
      onClose={() => (sidebarOpen = false)}
      email={data.user?.email}
      onLogout={logout}
    />

    <!-- Contain absolute elements such as hidden table captions inside this scroll area. -->
    <div
      class="relative flex min-h-0 min-w-0 flex-1 scroll-pt-16 flex-col overflow-y-auto overscroll-y-contain"
    >
      <AdminHeader
        {sidebarCollapsed}
        onMobileMenuClick={() => (sidebarOpen = true)}
        onSidebarToggle={() => (sidebarCollapsed = !sidebarCollapsed)}
      />

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

  <main tabindex="-1" id="main" class="admin-ui">
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
