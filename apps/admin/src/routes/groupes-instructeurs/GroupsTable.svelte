<script lang="ts">
  import type { PageData } from "./$types";

  let {
    title,
    groups,
    departments,
    onSelect,
  }: {
    title: string;
    groups: PageData["groups"];
    departments: string[];
    onSelect: (id: string) => void;
  } = $props();
</script>

<section
  id={title === "À vérifier" ? "groups-to-review" : undefined}
  aria-label={title}
  class="mt-4 overflow-hidden rounded-xl border border-[var(--border-default-grey)] bg-[var(--background-lifted-grey)]"
>
  <header class="flex items-center gap-2.5 px-4 py-3">
    <span
      class="size-2 shrink-0 rounded-full {title === 'À vérifier'
        ? 'bg-[var(--text-default-warning)]'
        : title === 'Actifs'
          ? 'bg-[var(--text-default-success)]'
          : 'bg-[var(--text-mention-grey)]'}"
      aria-hidden="true"
    ></span>
    <h2 class="m-0 text-base font-semibold">{title}</h2>
    <span
      class="rounded-md bg-[var(--background-contrast-grey)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--text-mention-grey)]"
    >
      {groups.length}
    </span>
  </header>

  {#if groups.length}
    <div class="overflow-x-auto">
      <table class="w-full min-w-[36rem] table-fixed border-collapse text-sm">
        <caption class="sr-only">Groupes {title.toLowerCase()}</caption>
        <colgroup><col class="w-[34%]" /><col /><col class="w-24" /><col class="w-24" /></colgroup>
        <thead
          class="border-y border-[var(--border-default-grey)] bg-[var(--background-alt-grey)] text-xs text-[var(--text-mention-grey)]"
        >
          <tr>
            <th scope="col" class="px-4 py-2 text-left font-medium">Groupe</th>
            <th scope="col" class="px-4 py-2 text-left font-medium">Départements</th>
            <th scope="col" class="px-4 py-2 text-right font-medium">Membres</th>
            <th scope="col" class="px-4 py-2 text-right font-medium">Dossiers</th>
          </tr>
        </thead>
        <tbody>
          {#each groups as group (group.id)}
            <tr
              class="group cursor-pointer border-t border-[var(--border-default-grey)] transition-colors first:border-t-0 hover:bg-[var(--background-lifted-grey-hover)] focus-visible:bg-[var(--background-lifted-grey-hover)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--border-action-high-blue-france)]"
              role="button"
              tabindex="0"
              aria-label={`Modifier ${group.name}`}
              onclick={() => onSelect(group.id)}
              onkeydown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(group.id);
                }
              }}
            >
              <th scope="row" class="px-4 py-3 text-left font-medium">
                <div class="flex items-center justify-between gap-2">
                  <span>{group.name}</span>
                  <span
                    class="fr-icon-arrow-right-s-line shrink-0 text-[var(--text-mention-grey)] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  ></span>
                </div>
              </th>
              <td class="px-4 py-3">
                {#if departments.length && departments.every( (department) => group.departments.includes(department) )}
                  <span class="rounded-md bg-[var(--background-contrast-grey)] px-2 py-1 text-xs"
                    >Tous</span
                  >
                {:else if group.departments.length}
                  <div class="flex flex-wrap gap-1">
                    {#each group.departments as department}
                      <span
                        class="rounded bg-[var(--background-contrast-grey)] px-1.5 py-0.5 text-xs tabular-nums"
                        >{department}</span
                      >
                    {/each}
                  </div>
                {:else}
                  <span class="text-[var(--text-mention-grey)]">Aucun</span>
                {/if}
              </td>
              <td class="px-4 py-3 text-right tabular-nums">{group.members.length}</td>
              <td class="px-4 py-3 text-right tabular-nums">{group.dossierCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p
      class="m-0 border-t border-[var(--border-default-grey)] px-4 py-4 text-sm text-[var(--text-mention-grey)]"
    >
      Aucun groupe.
    </p>
  {/if}
</section>
