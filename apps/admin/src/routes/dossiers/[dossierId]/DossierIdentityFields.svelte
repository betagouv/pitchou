<script lang="ts">
  import type { IdentityFormModel } from "./dossierAdminFormModel.ts";

  type Props = { identity: IdentityFormModel; idPrefix: string; lastNameRequired?: boolean };
  let { identity, idPrefix, lastNameRequired = false }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 w-full">
  <div class="fr-input-group w-full">
    <label class="fr-label" for={`${idPrefix}-last-name`}>Nom</label>
    <input
      class="fr-input w-full"
      id={`${idPrefix}-last-name`}
      type="text"
      required={lastNameRequired}
      bind:value={identity.lastName}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for={`${idPrefix}-first-names`}>Prénom(s)</label>
    <input
      class="fr-input w-full"
      id={`${idPrefix}-first-names`}
      type="text"
      bind:value={identity.firstNames}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for={`${idPrefix}-email`}>Adresse e-mail</label>
    <input
      class="fr-input w-full"
      id={`${idPrefix}-email`}
      type="email"
      autocomplete="email"
      bind:value={identity.email}
    />
  </div>
</div>
