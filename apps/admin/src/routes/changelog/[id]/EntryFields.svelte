<script lang="ts">
  import DatePicker from "@pitchou/ui/DatePicker.svelte";

  let {
    titre = $bindable(),
    versionMajor = $bindable(),
    versionMinor = $bindable(),
    versionPatch = $bindable(),
    date = $bindable(),
    published,
    onToggleStatus,
  }: {
    titre: string;
    versionMajor: string;
    versionMinor: string;
    versionPatch: string;
    date: string;
    published: boolean;
    onToggleStatus: () => void;
  } = $props();

  function onSegmentInput(
    event: Event & { currentTarget: HTMLInputElement },
    assign: (digits: string) => void,
  ) {
    const digits = event.currentTarget.value.replace(/\D/g, "").slice(0, 4);
    event.currentTarget.value = digits;
    assign(digits);
  }
</script>

<div class="fr-mb-3w flex shrink-0 items-end gap-6">
  <div class="fr-input-group fr-mb-0 flex-1">
    <label class="fr-label" for="changelog-titre">Titre</label>
    <input class="fr-input" type="text" id="changelog-titre" bind:value={titre} />
  </div>

  <div class="shrink-0">
    <span class="fr-label" id="changelog-version-label">Version</span>
    <div
      class="mt-2 flex items-center gap-1"
      role="group"
      aria-labelledby="changelog-version-label"
    >
      <input
        class="fr-input w-16 text-center"
        type="text"
        inputmode="numeric"
        aria-label="Version majeure"
        placeholder="1"
        value={versionMajor}
        oninput={(event) => onSegmentInput(event, (digits) => (versionMajor = digits))}
      />
      <span class="font-semibold text-gray-500" aria-hidden="true">.</span>
      <input
        class="fr-input w-16 text-center"
        type="text"
        inputmode="numeric"
        aria-label="Version mineure"
        placeholder="0"
        value={versionMinor}
        oninput={(event) => onSegmentInput(event, (digits) => (versionMinor = digits))}
      />
      <span class="font-semibold text-gray-500" aria-hidden="true">.</span>
      <input
        class="fr-input w-16 text-center"
        type="text"
        inputmode="numeric"
        aria-label="Version correctif"
        placeholder="0"
        value={versionPatch}
        oninput={(event) => onSegmentInput(event, (digits) => (versionPatch = digits))}
      />
    </div>
  </div>

  <div class="w-56 shrink-0">
    <label class="fr-label" for="changelog-date">Date</label>
    <div class="mt-2">
      <DatePicker
        id="changelog-date"
        label="Date de l'entrée"
        value={date}
        onChange={(value) => (date = value ?? "")}
      />
    </div>
  </div>

  <!-- Custom switch (admin-only page, so we allow ourselves to deviate from the DSFR). -->
  <div class="shrink-0">
    <span class="fr-label" id="changelog-statut-label">Statut</span>
    <button
      type="button"
      role="switch"
      aria-checked={published}
      aria-labelledby="changelog-statut-label"
      title="Publiée = visible sur la page « Nouveautés »"
      class="mt-2 flex h-10 cursor-pointer items-center gap-3 rounded-md border border-solid px-3 transition-colors {published
        ? 'border-green-700/40 bg-green-50'
        : 'border-gray-300 bg-gray-100'}"
      onclick={onToggleStatus}
    >
      <span
        class="relative inline-block h-5 w-9 rounded-full transition-colors {published
          ? 'bg-green-700'
          : 'bg-gray-400'}"
        aria-hidden="true"
      >
        <span
          class="absolute top-0.5 left-0.5 inline-block size-4 rounded-full bg-white shadow transition-transform {published
            ? 'translate-x-4'
            : ''}"
        ></span>
      </span>
      <span
        class="min-w-[4.5rem] text-left text-sm font-medium {published
          ? 'text-green-800'
          : 'text-gray-600'}"
      >
        {published ? "Publiée" : "Brouillon"}
      </span>
    </button>
  </div>
</div>
