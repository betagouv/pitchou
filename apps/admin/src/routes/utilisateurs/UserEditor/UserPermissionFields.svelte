<script lang="ts">
  import Select from "@pitchou/ui/Select.svelte";
  import type { SelectOption } from "@pitchou/ui/Select/options.ts";
  import { untrack } from "svelte";
  import {
    PERMISSIONS,
    PERMISSION_GROUPS,
    effectivePermissions,
    type Permission,
  } from "@pitchou/types/permissions.ts";
  import type { User } from "../model.ts";
  let {
    current,
    formId,
    active,
    bundles,
    saving,
  }: {
    current: User | undefined;
    formId: string;
    active: boolean;
    bundles: string[];
    saving: boolean;
  } = $props();
  type Override = "inherit" | "grant" | "exclude";
  const overrideOptions: SelectOption<Override>[] = [
    { value: "inherit", label: "Selon les profils" },
    { value: "grant", label: "Autoriser" },
    { value: "exclude", label: "Refuser" },
  ];
  const permissions = Object.keys(PERMISSIONS) as Permission[];
  let overrides = $state(
    untrack(
      () =>
        Object.fromEntries(
          permissions.map((permission) => [
            permission,
            current?.exclusions.includes(permission)
              ? "exclude"
              : current?.grants.includes(permission)
                ? "grant"
                : "inherit",
          ]),
        ) as Record<Permission, Override>,
    ),
  );
  const grants = $derived(permissions.filter((permission) => overrides[permission] === "grant"));
  const exclusions = $derived(
    permissions.filter((permission) => overrides[permission] === "exclude"),
  );
  const effective = $derived(effectivePermissions(bundles, grants, exclusions));
  const exceptionCount = $derived(grants.length + exclusions.length);
  let exceptionsOpen = $state(
    untrack(() => !!current?.grants.length || !!current?.exclusions.length),
  );
</script>

{#each grants as permission}<input type="hidden" name="grants" value={permission} />{/each}
{#each exclusions as permission}<input type="hidden" name="exclusions" value={permission} />{/each}
<details bind:open={exceptionsOpen} class="editor-section exceptions">
  <summary
    ><span>Droits personnalisés</span><span class="exception-count"
      >{exceptionCount
        ? `${exceptionCount} exception${exceptionCount > 1 ? "s" : ""}`
        : "Aucune exception"}</span
    ><span class="fr-icon-arrow-down-s-line fr-icon--sm" aria-hidden="true"></span></summary
  >
  <div class="exceptions-content">
    <p class="help">
      Par défaut, les profils définissent les droits. Une autorisation ajoute un droit ; un refus le
      retire, même s'il est inclus dans un profil.
    </p>
    <p class="help">
      Les droits d’administration nécessitent aussi « Accéder à l’administration ». Ils portent sur
      tous les dossiers, indépendamment des groupes.
    </p>
    {#each PERMISSION_GROUPS as group}
      <section aria-label={group.label} class="permission-group">
        <h3>{group.label}</h3>
        {#each group.permissions as permission}
          <div class="permission-row">
            <div>
              <label for={formId + "-" + permission}>{PERMISSIONS[permission]}</label><span
                class="permission-result"
                class:allowed={active && effective.includes(permission)}
                >{!active
                  ? "Compte désactivé"
                  : effective.includes(permission)
                    ? "Autorisé"
                    : "Non accordé"}</span
              >
            </div>
            <Select
              id={formId + "-" + permission}
              ariaLabel={`Exception : ${PERMISSIONS[permission]}`}
              class="w-48 max-w-full shrink-0 max-[575px]:w-full"
              options={overrideOptions}
              disabled={saving}
              bind:value={overrides[permission]}
            />
          </div>
        {/each}
      </section>
    {/each}
  </div>
</details>
