<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import { NO_GROUP, NO_PROFILE, type groupFilterOptions, type parseQuery } from "./list.ts";
  import { profiles } from "./model.ts";

  let {
    query,
    groupeOptions,
    updateQuery,
  }: {
    query: ReturnType<typeof parseQuery>;
    groupeOptions: ReturnType<typeof groupFilterOptions>;
    updateQuery: (values: Record<string, string>) => void;
  } = $props();

  const rowClass =
    "flex flex-row items-center gap-4 max-[768px]:flex-col max-[768px]:items-stretch max-[768px]:gap-1 [&_.fr-label]:mb-0 [&_.fr-label]:flex-[0_0_18rem] [&_.fr-label]:max-[768px]:flex-none";
</script>

<fieldset
  id="users-filters"
  class="border border-[color:var(--border-default-grey)] rounded-[0.25rem] fr-p-2w"
>
  <legend class="text-[1.25rem] fr-text--bold fr-mb-2w fr-p-0">Filtrer les utilisateurs</legend>
  <div class="flex flex-col gap-3 max-w-[48rem]">
    <div class={rowClass}>
      <label class="fr-label" for="user-group-filter">Groupe</label>
      <Select
        id="user-group-filter"
        class="min-w-0 flex-auto"
        ariaLabel="Filtrer par groupe"
        options={[
          { value: "", label: "Tous les groupes" },
          { value: NO_GROUP, label: "Aucun groupe" },
          ...groupeOptions,
        ]}
        value={query.groupe}
        onChange={(groupe) => updateQuery({ groupe })}
      />
    </div>
    <div class={rowClass}>
      <label class="fr-label" for="user-profile-filter">Profil</label>
      <Select
        id="user-profile-filter"
        class="min-w-0 flex-auto"
        ariaLabel="Filtrer par profil"
        options={[
          { value: "", label: "Tous les profils" },
          { value: NO_PROFILE, label: "Aucun profil" },
          ...Object.entries(profiles).map(([value, info]) => ({ value, label: info.label })),
        ]}
        value={query.profile}
        onChange={(profil) => updateQuery({ profil })}
      />
    </div>
  </div>
</fieldset>
