<script lang="ts">
  let {
    formId,
    name = $bindable(""),
    active = $bindable(true),
  }: { formId: string; name: string; active: boolean } = $props();
</script>

<div class="identity">
  <label class="field-label" for="group-name">Nom du groupe</label>
  <input
    class="name-input"
    id="group-name"
    name="name"
    autocomplete="off"
    data-form-type="other"
    data-1p-ignore
    data-lpignore="true"
    data-bwignore="true"
    data-protonpass-ignore="true"
    required
    maxlength="200"
    bind:value={name}
  />
  <label class="status-card">
    <span class="status-copy">
      <span class="field-label">Groupe actif</span>
      <span class="hint" id={formId + "-active-help"}
        >{active
          ? "Ce groupe prend en charge les dossiers dont le département principal fait partie de sa couverture. Le désactiver l'archive et retire ses affectations, sans supprimer les dossiers."
          : "Ce groupe est archivé et ne prend en charge aucun dossier. Ses membres et ses départements sont conservés. Le réactiver rétablit les affectations correspondant à sa couverture."}</span
      >
    </span>
    <input
      class="status-checkbox"
      type="checkbox"
      name="active"
      aria-label="Groupe actif"
      aria-describedby={formId + "-active-help"}
      bind:checked={active}
    />
    <span class="switch" aria-hidden="true"></span>
  </label>
</div>
