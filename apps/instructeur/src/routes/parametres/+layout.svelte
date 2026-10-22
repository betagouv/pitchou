<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import Select from "@pitchou/ui/Select.svelte";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
  const sections = [
    {
      value: "/parametres",
      label: "Général",
      title: "Général",
      icon: "fr-icon-settings-5-line",
    },
    {
      value: "/parametres/groupes",
      label: "Mes groupes",
      title: "Mes groupes instructeurs",
      icon: "fr-icon-team-line",
    },
    {
      value: "/parametres/notifications",
      label: "Notifications",
      title: "Notifications",
      icon: "fr-icon-mail-line",
    },
  ];
  const selected = $derived(page.url.pathname.replace(/\/$/u, ""));
  const currentSection = $derived(
    sections.find((section) => section.value === selected) ?? sections[0],
  );
</script>

<div class="mx-auto max-w-[72rem] py-6 md:py-10">
  <header class="mb-6 md:mb-8">
    <h1 class="fr-h2 m-0!">Paramètres</h1>
  </header>
  <div
    class="grid rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-default-grey)] md:grid-cols-[13rem_minmax(0,1fr)]"
  >
    <nav
      aria-label="Rubriques des paramètres"
      class="hidden rounded-l-xl border-r border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-3 md:block"
    >
      <ul class="sticky top-6 list-none m-0! p-0! space-y-1">
        {#each sections as section (section.value)}
          <li class="p-0!">
            <a
              href={section.value}
              aria-current={selected === section.value ? "page" : undefined}
              class="settings-link flex items-center gap-3 rounded-lg border border-transparent px-3 py-3"
            >
              <span class={`${section.icon} shrink-0`} aria-hidden="true"></span>
              <span class="min-w-0 font-bold">{section.label}</span>
            </a>
          </li>
        {/each}
      </ul>
    </nav>
    <div
      class="rounded-t-xl border-b border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] p-4 md:hidden"
    >
      <label for="settings-section" class="fr-sr-only">Rubrique des paramètres</label>
      <Select
        id="settings-section"
        options={sections.map(({ value, label }) => ({ value, label }))}
        value={selected}
        onChange={(path) => goto(path)}
      />
    </div>
    <section aria-labelledby="settings-view-title" class="min-w-0">
      <header
        class="flex items-center gap-3 border-b border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] px-5 py-5 md:rounded-tr-xl md:px-6"
      >
        <span
          class={`${currentSection.icon} text-[var(--text-action-high-blue-france)]`}
          aria-hidden="true"
        ></span>
        <h2 id="settings-view-title" class="fr-h5 m-0!">{currentSection.title}</h2>
      </header>
      <div class="rounded-b-xl bg-[var(--background-alt-grey)] p-4 md:rounded-bl-none md:p-6">
        {@render children()}
      </div>
    </section>
  </div>
</div>

<style>
  .settings-link {
    background-image: none;
    color: var(--text-default-grey);
  }
  .settings-link:hover {
    background-color: var(--background-contrast-grey);
  }
  .settings-link[aria-current="page"] {
    color: var(--text-action-high-blue-france);
    background-color: var(--background-contrast-blue-france);
    border-color: var(--border-action-high-blue-france);
  }
</style>
