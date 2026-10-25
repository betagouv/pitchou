<script lang="ts">
  import type { OnagreGroup } from "@pitchou/types/onagreServices.ts";
  let {
    groups,
    selected = $bindable(),
    disabled,
  }: { groups: OnagreGroup[]; selected: string[]; disabled: boolean } = $props();
  let search = $state("");
  let visible = $derived(
    groups
      .filter((group) =>
        [group.name, ...group.departments]
          .join(" ")
          .toLocaleLowerCase("fr")
          .includes(search.toLocaleLowerCase("fr")),
      )
      .sort(
        (a, b) =>
          Number(selected.includes(b.id)) - Number(selected.includes(a.id)) ||
          a.name.localeCompare(b.name, "fr"),
      ),
  );
  function toggle(id: string) {
    selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id];
  }
</script>

<div class="service-group-picker">
  <label for="group-search"
    >Groupes Pitchou <span class="onagre-context"
      >{selected.length} sélectionné{selected.length > 1 ? "s" : ""}</span
    ></label
  >
  <input
    id="group-search"
    class="fr-input"
    placeholder="Rechercher un groupe ou un département…"
    bind:value={search}
  />
  <p class="onagre-context">Choisissez le ou les groupes qui reprendront ce service.</p>
  <div class="service-group-list" role="group" aria-label="Groupes destinataires">
    {#each visible as group}
      <button
        type="button"
        class="service-group"
        aria-pressed={selected.includes(group.id)}
        disabled={disabled || (!group.active && !selected.includes(group.id))}
        onclick={() => toggle(group.id)}
      >
        <span class="service-check" aria-hidden="true"
          >{selected.includes(group.id) ? "✓" : ""}</span
        >
        <span
          ><strong>{group.name}{!group.active ? " · Inactif" : ""}</strong><small
            >{group.name.trim().toLocaleLowerCase("fr") === "administrateur"
              ? "Départements : Tous"
              : group.departments.length
                ? `Départements : ${group.departments.join(", ")}`
                : "Départements non renseignés"}{group.coverage_needs_review
              ? " · Périmètre à vérifier"
              : ""}</small
          ></span
        >
      </button>
    {:else}<p>Aucun groupe ne correspond à la recherche.</p>{/each}
  </div>
  {#each selected as id}<input type="hidden" name="groupIds" value={id} />{/each}
</div>
