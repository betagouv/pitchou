<script lang="ts">
  import type { IdentityFormModel } from "./dossierAdminFormModel.ts";
  import DossierIdentityFields from "./DossierIdentityFields.svelte";

  type Props = {
    identity: IdentityFormModel;
    kind: "mandataire" | "personne_contact";
    enabled: boolean;
  };
  let { identity, kind, enabled = $bindable() }: Props = $props();

  const title = $derived(kind === "mandataire" ? "Mandataire" : "Personne contact");
  const idPrefix = $derived(`edit-${kind}`);
</script>

<div class="w-full flex flex-col gap-4">
  <div class="fr-toggle">
    <input
      class="fr-toggle__input"
      id={`${idPrefix}-enabled`}
      type="checkbox"
      bind:checked={enabled}
    />
    <label
      class="fr-toggle__label"
      for={`${idPrefix}-enabled`}
      data-fr-checked-label="Oui"
      data-fr-unchecked-label="Non"
    >
      {kind === "mandataire"
        ? "Le dossier comporte un mandataire"
        : "Le dossier a une personne contact"}
    </label>
  </div>

  {#if enabled}
    <div class="w-full flex flex-col gap-4">
      <h3 class="fr-h6 fr-mb-0">{title}</h3>
      <DossierIdentityFields {identity} {idPrefix} />
      {#if kind === "personne_contact"}
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div class="fr-input-group w-full">
            <label class="fr-label" for={`${idPrefix}-phone`}>Téléphone</label>
            <input
              class="fr-input w-full"
              id={`${idPrefix}-phone`}
              type="tel"
              autocomplete="tel"
              bind:value={identity.phone}
            />
          </div>
          <div class="fr-input-group w-full">
            <label class="fr-label" for={`${idPrefix}-role`}>Rôle ou qualité</label>
            <input
              class="fr-input w-full"
              id={`${idPrefix}-role`}
              type="text"
              bind:value={identity.role}
            />
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
