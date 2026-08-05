<script lang="ts">
  import type { DossierAdminFormModel } from "./dossierAdminFormModel.ts";

  type Props = { model: DossierAdminFormModel };
  let { model }: Props = $props();
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
  <div class="fr-input-group w-full md:col-span-2">
    <label class="fr-label" for="edit-physical-address">Adresse</label>
    <input
      class="fr-input w-full"
      id="edit-physical-address"
      type="text"
      autocomplete="street-address"
      bind:value={model.personnePhysique.address}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for="edit-physical-phone">Téléphone</label>
    <input
      class="fr-input w-full"
      id="edit-physical-phone"
      type="tel"
      autocomplete="tel"
      bind:value={model.personnePhysique.phone}
    />
  </div>
  <div class="fr-input-group w-full">
    <label class="fr-label" for="edit-physical-role">Rôle ou qualification</label>
    <input
      class="fr-input w-full"
      id="edit-physical-role"
      type="text"
      bind:value={model.personnePhysique.role}
    />
  </div>
</div>
